export {};

declare global {
  var game: any;
  var ui: any;
  var Hooks: any;
  var foundry: any;
  var CONFIG: any;
  var CONST: any;
  var Scene: any;
  var Folder: any;

  interface GlobalThis {
    game: any;
    ui: any;
    Hooks: any;
    foundry: any;
    CONFIG: any;
    CONST: any;
    Scene: any;
    Folder: any;
  }
}
