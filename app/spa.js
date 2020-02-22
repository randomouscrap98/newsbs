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

BasicSpa.prototype.ProcessLink = function(url)
{
   this.Log.Debug("Processing link " + url);

   for(var i = 0; i < this.Processors.length; i++)
   {
      if(this.Processors[i].Check(url))
      {
         try
         {
            this.Processors[i].Process(url);
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

//Generate the click function for the given URL
BasicSpa.prototype.ClickFunction = function(url)
{
   var me = this;
   return function(event)
   {
      event.preventDefault();
      if(url !== document.location.href)
         if(me.ProcessLink(url))
            history.pushState({"url" : url}, url, url);
   };
};
