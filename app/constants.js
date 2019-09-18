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
   Log : "log"
};

var IMAGES = {
   IconRoot : "icons/",
};

IMAGES.Success = IMAGES.IconRoot + "success.png";
IMAGES.Home = IMAGES.IconRoot + "home.png";
IMAGES.Debug = IMAGES.IconRoot + "debug.png";
IMAGES.User = IMAGES.IconRoot + "user.png";

var NAMES = {
   Password : "password",
   PasswordConfirm : "passwordconfirm"
};

var ATTRIBUTES = {
   Active : "data-active",
   Running : "data-running"
};

var API = {
   Root: "/api/"
};

API.Users = API.Root + "users/";
API.Authorize = API.Users + "authenticate/";
API.SendEmail = API.Users + "sendemail/";
API.ConfirmEmail = API.Users + "confirm/";
API.Categories = API.Root + "categories/";
API.Content = API.Root + "content/";
