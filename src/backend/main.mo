import Map "mo:core/Map";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Nat "mo:core/Nat";

import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  type CompatPasteId = Nat;
  type CompatPasteIdMap = Map.Map<CompatPasteId, Text>;

  var guidCounter = 0;

  let storageChunkSize = 2_000_000_000;
  let fileSizeLimit = 50_000_000;
  let defaultExpiration : Int = 86_400_000_000_000;
  let tenMinuteExpiration : Int = 600_000_000_000;
  let oneWeekExpiration : Int = 604_800_000_000_000;
  let thirtyDayExpiration : Int = 2_592_000_000_000_000;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let pasteMap = Map.empty<Text, Paste>();
  let legacyIdMap = Map.empty<CompatPasteId, Text>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  func generateGUID() : Text {
    guidCounter += 1;
    (Time.now() + guidCounter).toText();
  };

  public type Paste = { expirationTime : Int; items : [PasteChunk] };
  public type UserProfile = { name : Text };
  public type PasteChunk = { #text : Text; #file : FileChunk };
  public type FileChunk = { data : Storage.ExternalBlob; filename : Text; contentType : ?Text };
  public type PasteChunkType = { #file; #text };

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
      case ("10min") { Time.now() + tenMinuteExpiration };
      case ("7days") { Time.now() + oneWeekExpiration };
      case ("30days") { Time.now() + thirtyDayExpiration };
      case (_) { Time.now() + defaultExpiration };
    };

    let paste = { items = chunks; expirationTime };
    let id = generateGUID();
    pasteMap.add(id, paste);
    id;
  };

  func resolvePasteId(pasteId : Text) : Text {
    let maybeLegacyId = Nat.fromText(pasteId);
    switch (maybeLegacyId) {
      case (?legacyId) {
        switch (legacyIdMap.get(legacyId)) {
          case (?mappedId) { mappedId };
          case (null) { pasteId };
        };
      };
      case (null) { pasteId };
    };
  };

  public query ({ caller }) func getPaste(pasteId : Text) : async Paste {
    // No authorization check - anyone with the link can view pastes (including guests)
    switch (pasteMap.get(resolvePasteId(pasteId))) {
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
    // No authorization check - anyone with the link can view pastes (including guests)
    switch (pasteMap.get(resolvePasteId(pasteId))) {
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list pastes");
    };
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
    // No authorization check - anyone viewing a paste can see its expiration time
    switch (pasteMap.get(resolvePasteId(pasteId))) {
      case (?paste) {
        if (Time.now() > paste.expirationTime) { 0 } else {
          paste.expirationTime - Time.now();
        };
      };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getFileMetadata(pasteId : Text) : async [(Text, ?Text)] {
    // No authorization check - anyone viewing a paste can see file metadata
    switch (pasteMap.get(resolvePasteId(pasteId))) {
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

  // Reset all default values.
  public shared ({ caller }) func systemDefaultReset() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    guidCounter := 0;
  };

  public query ({ caller }) func systemDefaultCheck() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    if (guidCounter != 0) {
      Runtime.trap("Default settings have been changed. Please reset. ");
    };
  };

  // Needed for clear function errors. If the canister runs out of memory, we must delete old data.
  public shared ({ caller }) func clearAllPastes() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    pasteMap.clear();
  };

  // Needed for clear function errors. If the canister runs out of memory, we must delete old data.
  public shared ({ caller }) func clearLegacyIdMap() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    legacyIdMap.clear();
  };

  // Needed for clear function errors. If the canister runs out of memory, we must delete old data.
  public shared ({ caller }) func clearUserProfiles() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    userProfiles.clear();
  };
};
