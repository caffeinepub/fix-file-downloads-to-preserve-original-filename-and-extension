import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";

module {
  type CompatPasteId = Nat;

  type Paste = {
    expirationTime : Int;
    items : [PasteChunk];
    owner : ?Principal;
    password : ?Text;
  };

  type UserProfile = { name : Text };

  type PasteChunk = { #text : Text; #file : FileChunk };

  type FileChunk = {
    data : Storage.ExternalBlob;
    filename : Text;
    contentType : ?Text;
  };

  type OldActor = {
    pasteMap : Map.Map<Text, Paste>;
    legacyIdMap : Map.Map<CompatPasteId, Text>;
    userProfiles : Map.Map<Principal, UserProfile>;
  };

  type NewActor = OldActor;

  public func run(old : OldActor) : NewActor {
    old;
  };
};
