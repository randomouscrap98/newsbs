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

   try
   {
      var spa = new BasicSpa(Log);
      var request = new Requests(Log);
      var gen = new ComplexGenerate(Log);
      var formGenerate = new ComplexFormGenerate(Log, request);
      var generate = new AppGenerate(Log, request, gen, formGenerate, spa);

      //We're the only ones with enough knowledge about how to route. 
      var routes = [
         new SpaProcessor(
            function(url) { return url.indexOf('butt')>=0; },
            function(url) { alert("Found a butt"); }
         )
      ];

      for(var i = 0; i < routes.length; i++)
         spa.Processors.push(routes[i]);

      window.onpopstate = function(event)
      {
         Log.Debug("User browser navigated back/forward to " + document.location.href);
         spa.ProcessLink(document.location.href);
      };

      generate.elements = {
         ContentContainer : $("#" + IDS.LeftScroller),
         SelectContainer : $("#" + IDS.RightPane),
         SmallNav : $("#" + IDS.SmallNav)
      };

      Log.Debug("Setup all services");

      //Preload images
      for(var key in IMAGES)
         if(IMAGES.hasOwnProperty(key) && key.indexOf("Root") < 0)
            $("<img/>").attr("src", IMAGES[key]).appendTo($("#" + IDS.Cache));

      Log.Debug("Preloading images");

      generate.ResetSmallNav(); //.children().first().click();
      spa.ProcessLink(document.location.href);
   }
   catch(ex)
   {
      Log.Error("Could not setup website: " + ex);
   }

   Log.Info("Website loaded (pending content)");
});

