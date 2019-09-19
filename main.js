//Carlos Sanchez
//9-11-2019

var CONST =
{
   MaxLogMessages : 5000,
   LogMessageEraseBuffer : 500,
   LogConsole : true,
   Inputs : "input, button, textarea"
};

var Log = new Logger(CONST.LogConsole, CONST.MaxLogMessages, CONST.LogMessageEraseBuffer);

$( document ).ready(function()
{
   Log.Info("Document ready: loading website");

   var gen = new Generate();
   var request = new Requests(Log);
   var formGenerate = new ComplexFormGenerate(Log, request);
   var generate = new AppGenerate(Log, request, gen, formGenerate);

   Log.Debug("Setup all services");

   try
   {
      var EMain = {
         LeftPane : $("#leftpane"),
         LeftScroller : $("#leftscroller"),
         RightPane : $("#rightpane"),
         SmallNav : $("#smallnav"),
         Cache : $("#cache") 
      };

      Log.Debug("Cached all desired elements");

      //Before doing ANYTHING, start preloading images. 
      for(var key in IMAGES)
      {
         if(IMAGES.hasOwnProperty(key) && key.indexOf("Root") < 0)
            $("<img/>").attr("src", IMAGES[key]).appendTo(EMain.Cache);
      }

      Log.Debug("Preloading images");

      generate.ResetSmallNav(EMain.SmallNav, EMain.RightPane, EMain.LeftScroller);
      EMain.SmallNav.children().first().click();
   }
   catch(ex)
   {
      Log.Error("Could not setup website: " + ex);
   }

   Log.Info("Website loaded (pending content)");
});

