//Carlos Sanchez
//9-11-2019

var CONST =
{
   Active : "data-active"
};

var EMain = false;
var Log = CreateLogger(true);

$( document ).ready(function()
{
   Log.Info("Document ready: loading website");

   try
   {
      EMain = {
         LeftPane : $("#leftpane"),
         LeftScroller : $("#leftscroller"),
         RightPane : $("#rightpane"),
         SmallNav : $("#smallnav")
      };
      
      Log.Debug("Cached all desired elements");

      var landingButton = MakeSmallNavButton("icons/home.png", "#77C877", CreateHome);
      EMain.SmallNav.append(landingButton);
      EMain.SmallNav.append(MakeSmallNavButton("icons/debug.png", "#C8A0C8", Log.GetMessagesHtml));
      EMain.SmallNav.append(MakeSmallNavButton("icons/user.png", "#77AAFF", CreateLogin));

      Log.Debug("Created mini navigation");

      landingButton.click();
   }
   catch(ex)
   {
      Log.Error("Could not setup website: " + ex);
   }
});

function SetDisplayedContent(content)
{
   EMain.LeftScroller.empty();
   EMain.LeftScroller.append(content);
}

function AppendDisplayedContent(content)
{
   EMain.LeftScroller.append(content);
}

function CreateHome()
{
   Log.Debug("Creating Homepage");

   var main = MakeContent("");
   var header = $("<h1>SmileBASIC Source</h1>");
   main.append(header);


   return main;
}

function CreateLogin()
{
   Log.Debug("Creating Login/Register page");

   var main = MakeContent("");
   var header = $("<h2>Login</h2>");
   main.append(header);

   return main;
}

// ****************************************
// * WARN: FUNCTIONS DEPENDING ON GLOBALS *
// ****************************************
//
// These are essentially scripts
 
//Setting active CONTENT will update the left pane. Anything can be content...
function SetActiveContent(element, content)
{
   //One day this may also need to disable background ajax or whatever. It'll
   //need to do MORE than just set a singleton attribute for the entire right pane.
   SetSingletonAttribute(element, EMain.RightPane, CONST.Active);
   SetDisplayedContent(content);
}

function MakeSmallNavButton(icon, color, contentFunc)
{
   return MakeIconButton(icon, color, function(b)
   {
      try
      {
         SetActiveContent(b, contentFunc());
      }
      catch(ex)
      {
         Log.Warn("Could not click small nav button: " + ex);
      }
   });
}
