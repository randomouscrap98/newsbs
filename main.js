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

      var contentContainer = $("#" + IDS.LeftScroller);
      var selectContainer = $("#" + IDS.RightPane);
      var smallNav = $("#" + IDS.SmallNav);

      var pRoutes = { };

      var createNavItem = function(name, image, color, pageFunc)
      {
         var element = generate.CreateSpaIcon(name ? "?p=" + name : "", image, color);
         element.prop("id", "nav" + (name || "home"));
         //Either we HAVE content RIGHT NOW (meaning func is actually content) or we'll 
         //GIVE you the function necessary to append your content when you're ready.
         if(!$.isFunction(pageFunc)) 
         {
            var content = pageFunc;
            pageFunc = function(fc) { fc(content); };
         }
         pRoutes[name] = function(url)  //What happens when we activate the route
         { 
            gen.SetSingletonAttribute(element, selectContainer, ATTRIBUTES.Active);
            contentContainer.empty(); //Turn this into a loading screen?
            pageFunc(function(content) { contentContainer.append(content); }, element);
         };
         smallNav.append(element);
         return element;
      };

      var userButton = false;
      var refreshMe = function(userFunc)
      {
         request.GetMe(function(userData)
         {
            //Update the user icon whenever we refresh our "me" status.
            if(userData)
               gen.SetElementImageIcon(userButton, IMAGES.TempAvatar);
            else
               gen.SetElementImageIcon(userButton, IMAGES.User);

            if(userFunc) 
               userFunc(userData);
         });
      };

      createNavItem("", IMAGES.Home, "#77C877", function(fc) { fc(generate.CreateHome()); });
      createNavItem("test", IMAGES.Test, "rgb(235, 190, 116)", function(fc) { fc(generate.CreateTestArea()); });
      createNavItem("debug", IMAGES.Debug, "#C8A0C8", function(fc) { fc(gen.LogMessages()); });
      userButton = createNavItem("me", IMAGES.User, "#77AAFF", function(fc)
      {
         //Instantly refresh "me" when we go to this page. Also load
         //content based on whether "me" exists.
         refreshMe(function(user)
         {
            if(user)
               fc(generate.CreateUserHome(user));
            else
               fc(generate.CreateLogin());
         });
      });
      
      var pRouter = function(url)
      {
         //Figure out the p
         var params = new URLSearchParams(url.split("?")[1]);
         var pVal = params.get("p") || ""; //Safe for now.
         return pRoutes[pVal];
      };

      //We're the only ones with enough knowledge about how to route. 
      var routes = [
         new SpaProcessor(pRouter, function(url) { pRouter(url)(url); })
      ];

      for(var i = 0; i < routes.length; i++)
         spa.Processors.push(routes[i]);

      window.onpopstate = function(event)
      {
         Log.Debug("User browser navigated back/forward to " + document.location.href);
         spa.ProcessLink(document.location.href);
      };

      Log.Debug("Setup all services");

      //Preload images
      for(var key in IMAGES)
         if(IMAGES.hasOwnProperty(key) && key.indexOf("Root") < 0)
            $("<img/>").attr("src", IMAGES[key]).appendTo($("#" + IDS.Cache));

      Log.Debug("Preloading images");

      refreshMe();
      spa.ProcessLink(document.location.href);
   }
   catch(ex)
   {
      Log.Error("Could not setup website: " + ex);
   }

   Log.Info("Website loaded (pending content)");
});

