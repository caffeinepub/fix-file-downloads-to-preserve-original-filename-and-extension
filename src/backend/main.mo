import Map "mo:core/Map";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Int "mo:core/Int";
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

  public type Paste = {
    expirationTime : Int;
    items : [PasteChunk];
    owner : ?Principal;
    password : ?Text;
  };

  public type UserProfile = { name : Text };

  public type PasteChunk = {
    #text : Text;
    #file : FileChunk;
  };

  public type FileChunk = {
    data : Storage.ExternalBlob;
    filename : Text;
    contentType : ?Text;
  };

  public type PasteChunkType = {
    #file;
    #text;
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

  public shared ({ caller }) func saveCallerUserProfile(userProfile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, userProfile);
  };

  public shared ({ caller }) func createPaste(
    pasteChunks : [PasteChunk],
    expirationType : Text,
    password : ?Text
  ) : async Text {
    if (pasteChunks.isEmpty()) {
      return "";
    };

    let expirationTime = switch (expirationType) {
      case ("10min") { Time.now() + tenMinuteExpiration };
      case ("7days") { Time.now() + oneWeekExpiration };
      case ("30days") { Time.now() + thirtyDayExpiration };
      case (_) { Time.now() + defaultExpiration };
    };

    let owner = if (AccessControl.hasPermission(accessControlState, caller, #user)) {
      ?caller;
    } else {
      null;
    };

    let finalPassword = switch (owner) {
      case (?_) { password };
      case (null) { null };
    };

    let paste = {
      items = pasteChunks;
      expirationTime;
      owner;
      password = finalPassword;
    };
    let pasteId = generateGUID();
    pasteMap.add(pasteId, paste);
    pasteId;
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

  func verifyPasteAccess(paste : Paste, caller : Principal, providedPassword : ?Text) : Bool {
    if (Time.now() > paste.expirationTime) {
      return false;
    };

    switch (paste.password) {
      case (?pastePassword) {
        switch (paste.owner) {
          case (?owner) {
            if (Principal.equal(owner, caller)) {
              return true;
            };
          };
          case (null) {};
        };

        switch (providedPassword) {
          case (?pwd) { Text.equal(pwd, pastePassword) };
          case (null) { false };
        };
      };
      case (null) { true };
    };
  };

  public query ({ caller }) func getPaste(pasteId : Text, password : ?Text) : async ?Paste {
    if (Text.equal(pasteId, "")) {
      return null;
    };

    let resolvedId = resolvePasteId(pasteId);
    switch (pasteMap.get(resolvedId)) {
      case (?paste) {
        if (verifyPasteAccess(paste, caller, password)) {
          ?paste;
        } else {
          null;
        };
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func getPasteChunksWithTypes(pasteId : Text, password : ?Text) : async [(PasteChunk, PasteChunkType)] {
    let resolvedId = resolvePasteId(pasteId);
    switch (pasteMap.get(resolvedId)) {
      case (?paste) {
        if (not verifyPasteAccess(paste, caller, password)) {
          Runtime.trap("Paste does not exist or has expired");
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

  public shared ({ caller }) func extendExpiration(
    pasteId : Text,
    newExpirationType : Text,
    _password : ?Text
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only logged-in users can extend expiration");
    };

    let resolvedId = resolvePasteId(pasteId);
    switch (pasteMap.get(resolvedId)) {
      case (?paste) {
        switch (paste.owner) {
          case (?owner) {
            if (not Principal.equal(owner, caller)) {
              Runtime.trap("Unauthorized: You can only extend expiration of your own pastes");
            };
          };
          case (null) {
            Runtime.trap("Unauthorized: Cannot extend expiration of anonymous pastes");
          };
        };

        if (Time.now() > paste.expirationTime) {
          Runtime.trap("Cannot extend expiration of expired paste");
        };

        let newExpirationTime = switch (newExpirationType) {
          case ("10min") { Time.now() + tenMinuteExpiration };
          case ("7days") { Time.now() + oneWeekExpiration };
          case ("30days") { Time.now() + thirtyDayExpiration };
          case (_) { Time.now() + defaultExpiration };
        };

        let updatedPaste = {
          items = paste.items;
          expirationTime = newExpirationTime;
          owner = paste.owner;
          password = paste.password;
        };
        pasteMap.add(resolvedId, updatedPaste);
      };
      case (null) { Runtime.trap("Paste does not exist") };
    };
  };

  public shared ({ caller }) func editPaste(pasteId : Text, newItems : [PasteChunk]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only logged-in users can edit pastes");
    };

    let resolvedId = resolvePasteId(pasteId);
    switch (pasteMap.get(resolvedId)) {
      case (?paste) {
        switch (paste.owner) {
          case (?owner) {
            if (not Principal.equal(owner, caller)) {
              Runtime.trap("Unauthorized: You can only edit your own pastes");
            };
          };
          case (null) {
            Runtime.trap("Unauthorized: Cannot edit anonymous pastes");
          };
        };

        if (Time.now() > paste.expirationTime) {
          Runtime.trap("Cannot edit expired paste");
        };

        let updatedPaste = {
          items = newItems;
          expirationTime = paste.expirationTime;
          owner = paste.owner;
          password = paste.password;
        };
        pasteMap.add(resolvedId, updatedPaste);
      };
      case (null) { Runtime.trap("Paste does not exist") };
    };
  };

  public shared ({ caller }) func deletePaste(pasteId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only logged-in users can delete pastes");
    };

    let resolvedId = resolvePasteId(pasteId);
    switch (pasteMap.get(resolvedId)) {
      case (?paste) {
        switch (paste.owner) {
          case (?owner) {
            if (not Principal.equal(owner, caller)) {
              Runtime.trap("Unauthorized: You can only delete your own pastes");
            };
          };
          case (null) {
            Runtime.trap("Unauthorized: Cannot delete anonymous pastes");
          };
        };

        pasteMap.remove(resolvedId);
      };
      case (null) { Runtime.trap("Paste does not exist") };
    };
  };

  public shared ({ caller }) func saveFile(
    blob : Storage.ExternalBlob,
    filename : Text,
    contentType : ?Text
  ) : async FileChunk {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only logged-in users can upload files");
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

  public query ({ caller }) func listMyPastes() : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only logged-in users can list their pastes");
    };

    pasteMap.entries().toArray().filter(
      func((_, paste)) {
        if (Time.now() > paste.expirationTime) { return false };
        switch (paste.owner) {
          case (?owner) { Principal.equal(owner, caller) };
          case (null) { false };
        };
      }
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
    let resolvedId = resolvePasteId(pasteId);
    switch (pasteMap.get(resolvedId)) {
      case (?paste) {
        if (Time.now() > paste.expirationTime) { 0 } else {
          paste.expirationTime - Time.now();
        };
      };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getFileMetadata(
    pasteId : Text,
    password : ?Text
  ) : async [(Text, ?Text)] {
    let resolvedId = resolvePasteId(pasteId);
    switch (pasteMap.get(resolvedId)) {
      case (?paste) {
        if (not verifyPasteAccess(paste, caller, password)) {
          Runtime.trap("Paste does not exist or has expired");
        };

        paste.items.filter(
          func(pasteChunk) {
            switch (pasteChunk) {
              case (#file(_)) { true };
              case (#text(_)) { false };
            };
          }
        ).map<PasteChunk, (Text, ?Text)>(
          func(pasteChunk) {
            switch (pasteChunk) {
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

  public query ({ caller }) func isPasteOwner(pasteId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return false;
    };

    let resolvedId = resolvePasteId(pasteId);
    switch (pasteMap.get(resolvedId)) {
      case (?paste) {
        switch (paste.owner) {
          case (?owner) { Principal.equal(owner, caller) };
          case (null) { false };
        };
      };
      case (null) { false };
    };
  };

  public query ({ caller }) func getPassword(pasteId : Text) : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only logged-in users can access password information");
    };

    let resolvedId = resolvePasteId(pasteId);
    switch (pasteMap.get(resolvedId)) {
      case (?paste) {
        switch (paste.owner) {
          case (?owner) {
            if (not Principal.equal(owner, caller)) {
              Runtime.trap("Unauthorized: You can only access password of your own pastes");
            };
          };
          case (null) {
            Runtime.trap("Unauthorized: Cannot access password of anonymous pastes");
          };
        };
        paste.password;
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func getPasteHistory() : async ?[(Text, Paste)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only logged-in users can access paste history");
    };

    let userPastes = pasteMap.entries().toArray().filter(
      func((_, paste)) {
        switch (paste.owner) {
          case (?owner) { Principal.equal(owner, caller) };
          case (null) { false };
        };
      }
    );

    if (userPastes.size() == 0) {
      return null;
    };
    ?userPastes;
  };

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

  public shared ({ caller }) func clearAllPastes() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    pasteMap.clear();
  };

  public shared ({ caller }) func clearLegacyIdMap() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    legacyIdMap.clear();
  };

  public shared ({ caller }) func clearUserProfiles() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    userProfiles.clear();
  };
};
