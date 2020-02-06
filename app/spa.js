//Carlos Sanchez
//11-9-2019

function SpaProcessor(check, process) 
{ 
   this.Check = check;
   this.Process = process;
}

//Basic: a function checks a url. If it processed it, it returns true.
function BasicSpa(logger)
{
   //Capitals are accessible from other places
   this.Log = logger;
   this.Processors = [];
}

BasicSpa.prototype.ProcessLink = function(url) //, element)
{
   this.Log.Debug("Processing link " + url);

   for(var i = 0; i < this.Processors.length; i++)
   {
      if(this.Processors[i].Check(url)) //, element))
      {
         try
         {
            this.Processors[i].Process(url); //, element);
         }
         catch(ex)
         {
            this.Log.Error("Could not process link " + url + ": " + ex);
         }
         return true;
      }
   }

   this.Log.Warn("Nothing processed link " + url);
   return false;
};

//Create a clickable element that "brings you" to the given url. Also changes
//the url on the webpage (careful)
BasicSpa.prototype.SetupClickable = function(element, url)
{
   //console.log("SETTING UP CLICKABLE TO " + url);
   var me = this;
   element.click(function(event)
   {
      event.preventDefault();
      //alert("PREVENTED DEFUlAT");
      if(url !== document.location.href)
         if(me.ProcessLink(url))
            history.pushState({"url" : url}, url, url);
   });
   return element;
};
