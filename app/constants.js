//Carlos Sanchez
//9-15-2019
//Deps: none


var CLASSES = {
   Content : "content",
   Section : "section",
   Error : "error",
   Errors : "errors",
   List : "list",
   Hover : "hover",
   Control : "control",
   Icon : "icon",
   Clickable : "clickable",
   Header : "header",
   Standalone : "standalone",
   Meta : "meta",
   Success : "success",
   Log : "log",
   Avatar: "avatar",
   ImageIcon : "imageicon"
};

var SELECTORS = {
   Submit : "input[type='submit']",
   Inputs : "input, textarea",
   AllInteract : "input, button, textarea"
};

var IMAGES = {
   IconRoot : "icons/",
};

IMAGES.Success = IMAGES.IconRoot + "success.png";
IMAGES.Home = IMAGES.IconRoot + "home.png";
IMAGES.Test = IMAGES.IconRoot + "test.png";
IMAGES.Debug = IMAGES.IconRoot + "debug.png";
IMAGES.User = IMAGES.IconRoot + "user.png";
IMAGES.Logout = IMAGES.IconRoot + "logout.png";
IMAGES.TempAvatar = IMAGES.IconRoot + "tempAvatar.png";

var NAMES = {
   Password : "password",
   PasswordConfirm : "passwordconfirm",
   Username : "username",
   Email : "email"
};

var IDS = {
   NavHome : "navhome",
   NavDebug : "navdebug",
   NavUser : "navuser",
   Cache : "cache",
   SmallNav : "smallnav",
   LeftScroller : "leftscroller",
   RightPane : "rightpane"
};

var ATTRIBUTES = {
   Active : "data-active",
   Running : "data-running",
   Number : "data-number"
};

var CONTENTTYPES = {
   Discussion : "discussion"
};

var CONTENTFORMATS = {
   Plain : "plain"
};

var WEBSITE = {
   MasterCategory : "sbs-main",
   DefaultContentAccess : "cr"
};

//Not ready for this kind of stuff yet.
//var QUERYPARAMS = {
//   Category : {
//      ParentId : "parentId"
//   }
//};
//
//var RESULTFIELDS = {
//   Collection : "collection"
//};

var API = {
   Root: "/api/",
   LocalRoot: "https://localhost:5001/api/"
};

API.Users = API.Root + "users/";
API.Credentials = API.Users + "credentials/";
API.Authorize = API.Users + "authenticate/";
API.SendEmail = API.Users + "sendemail/";
API.ConfirmEmail = API.Users + "confirm/";
API.UserMe = API.Users + "me/";
API.Categories = API.Root + "categories/";
API.Content = API.Root + "content/";
