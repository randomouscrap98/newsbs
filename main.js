//Carlos Sanchez
//9-11-2019

var CONST =
{
   MaxLogMessages : 5000,
   LogMessageEraseBuffer : 500,
   LogConsole : true,
   Inputs : "input, button, textarea"
};

var EMain = false;

var Log = new Logger();
Log.consoleLog = CONST.LogConsole;
Log.maxMessages = CONST.MaxLogMessages; 
Log.maxBuffer = CONST.LogMessageEraseBuffer;
var request = new Request(Log);
var formGenerate = new FormGenerate(Log, request);
var generate = new AppGenerate(Log, request, new Generate(), formGenerate);

$( document ).ready(function()
{
   Log.Info("Document ready: loading website");

   try
   {
      var cache = $("#cache");

      //Before doing ANYTHING, start preloading images. 
      for(var key in IMAGES)
      {
         if(IMAGES.hasOwnProperty(key) && key.indexOf("Root") < 0)
            $("<img/>").attr("src", IMAGES[key]).appendTo(cache);
      }

      Log.Debug("Preloading images");

      EMain = {
         LeftPane : $("#leftpane"),
         LeftScroller : $("#leftscroller"),
         RightPane : $("#rightpane"),
         SmallNav : $("#smallnav"),
         Cache : cache
      };
      
      Log.Debug("Cached all desired elements");

      //ResetSmallNav();
      //EMain.SmallNav.children().first().click();
   }
   catch(ex)
   {
      Log.Error("Could not setup website: " + ex);
   }

   Log.Info("Website loaded (pending content)");
});

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
   SetSingletonAttribute(element, EMain.RightPane, ATTRIBUTES.Active);
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

function SetDisplayedContent(content)
{
   EMain.LeftScroller.empty();
   EMain.LeftScroller.append(content);
}

function AppendDisplayedContent(content)
{
   EMain.LeftScroller.append(content);
}

function ResetSmallNav()
{
   EMain.SmallNav.empty();

   EMain.SmallNav.append(MakeSmallNavButton("icons/home.png", "#77C877", CreateHome));
   EMain.SmallNav.append(MakeSmallNavButton("icons/debug.png", "#C8A0C8", Log.GetMessagesHtml));
   EMain.SmallNav.append(MakeSmallNavButton("icons/user.png", "#77AAFF", CreateLogin));

   Log.Debug("Reset mini navigation");
}
