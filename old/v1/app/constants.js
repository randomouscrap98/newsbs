//Carlos Sanchez
//9-15-2019
//Deps: none


var SELECTORS = {
   Submit : "input[type='submit']",
   Inputs : "input, textarea",
   AllInteract : "input, button, textarea"
};

var ICONROOT = "icons/";
var IMAGES = {
   Success : ICONROOT + "success.png",
   Home : ICONROOT + "home.png",
   Test : ICONROOT + "test.png",
   Debug : ICONROOT + "debug.png",
   User : ICONROOT + "user.png",
   Logout : ICONROOT + "logout.png",
   TempAvatar : ICONROOT + "tempAvatar.png"
};


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

//API.Root = API.LocalRoot;

API.Users = API.Root + "users/";
API.Credentials = API.Users + "credentials/";
API.Authorize = API.Users + "authenticate/";
API.SendEmail = API.Users + "sendemail/";
API.ConfirmEmail = API.Users + "confirm/";
API.UserMe = API.Users + "me/";
API.Categories = API.Root + "categories/";
API.Content = API.Root + "content/";
