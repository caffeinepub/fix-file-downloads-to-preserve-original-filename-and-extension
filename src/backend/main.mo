import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Order "mo:core/Order";


import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  let storageChunkSize = 2_000_000_000;
  var nextPasteId = 0;
  let fileSizeLimit = 50_000_000;
  let defaultExpiration = 86_400_000_000_000;
  let oneWeekExpiration = 604_800_000_000_000;
  let thirtyDayExpiration = 2_592_000_000_000_000;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let pasteMap = Map.empty<Text, Paste>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  public type Paste = { expirationTime : Int; items : [PasteChunk] };
  public type UserProfile = { name : Text };
  public type PasteChunk = { #text : Text; #file : FileChunk };
  public type FileChunk = { data : Storage.ExternalBlob; filename : Text; contentType : ?Text };
  public type PasteChunkType = { #file; #text };

  module Paste {
    public func compare(paste1 : (Text, Paste), paste2 : (Text, Paste)) : Order.Order {
      if (paste1.1.expirationTime < paste2.1.expirationTime) { #less } else {
        #greater;
      };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func createPaste(chunks : [PasteChunk], expirationType : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create pastes");
    };

    let expirationTime = switch (expirationType) {
      case ("7days") { Time.now() + oneWeekExpiration };
      case ("30days") { Time.now() + thirtyDayExpiration };
      case (_) { Time.now() + defaultExpiration };
    };

    let paste = { items = chunks; expirationTime };
    let id = nextPasteId.toText();
    nextPasteId += 1;
    pasteMap.add(id, paste);
    id;
  };

  public query ({ caller }) func getPaste(pasteId : Text) : async Paste {
    switch (pasteMap.get(pasteId)) {
      case (?paste) {
        if (Time.now() > paste.expirationTime) {
          Runtime.trap("Paste has expired");
        };
        paste;
      };
      case (null) { Runtime.trap("Paste does not exist or has expired") };
    };
  };

  public query ({ caller }) func getPasteChunksWithTypes(pasteId : Text) : async [(PasteChunk, PasteChunkType)] {
    switch (pasteMap.get(pasteId)) {
      case (?paste) {
        if (Time.now() > paste.expirationTime) {
          Runtime.trap("Paste has expired");
        };
        paste.items.map<PasteChunk, (PasteChunk, PasteChunkType)>(
          func(chunk) {
            let chunkType = switch (chunk) {
              case (#file(_)) { #file };
              case (#text(_)) { #text };
            };
            (chunk, chunkType);
          }
        );
      };
      case (null) { Runtime.trap("Paste does not exist or has expired") };
    };
  };

  public shared ({ caller }) func saveFile(blob : Storage.ExternalBlob, filename : Text, contentType : ?Text) : async FileChunk {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upload files");
    };
    if (blob.size() > fileSizeLimit) {
      Runtime.trap("File size exceeds the limit of 50MB");
    };
    {
      data = blob;
      filename;
      contentType;
    };
  };

  public query ({ caller }) func listActivePastes() : async [Text] {
    pasteMap.entries().toArray().filter(
      func((_, paste)) { Time.now() <= paste.expirationTime }
    ).map<(Text, Paste), Text>(func((id, _)) { id });
  };

  public shared ({ caller }) func deleteExpiredPastes() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let now = Time.now();
    let entriesToDelete = pasteMap.entries().toArray().filter(
      func((_, paste)) { now > paste.expirationTime }
    );
    for ((pasteId, _) in entriesToDelete.values()) {
      pasteMap.remove(pasteId);
    };
  };

  public query ({ caller }) func getRemainingTime(pasteId : Text) : async Int {
    switch (pasteMap.get(pasteId)) {
      case (?paste) {
        if (Time.now() > paste.expirationTime) { 0 } else {
          paste.expirationTime - Time.now();
        };
      };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getFileMetadata(pasteId : Text) : async [(Text, ?Text)] {
    switch (pasteMap.get(pasteId)) {
      case (?paste) {
        if (Time.now() > paste.expirationTime) {
          Runtime.trap("Paste has expired");
        };
        paste.items.filter(
          func(chunk) {
            switch (chunk) {
              case (#file(_)) { true };
              case (#text(_)) { false };
            };
          }
        ).map<PasteChunk, (Text, ?Text)>(
          func(chunk) {
            switch (chunk) {
              case (#file(fileChunk)) {
                (fileChunk.filename, fileChunk.contentType);
              };
              case (#text(_)) { ("", null) : (Text, ?Text) };
            };
          }
        );
      };
      case (null) { Runtime.trap("Paste does not exist or has expired") };
    };
  };
};
