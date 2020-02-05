//Carlos Sanchez
//11-9-2019

/*function SpaAction(checker, action)
{
   this.Checker = checker;
   this.Action = action;
}

function Spa(logger)
{
   this.Log = logger;
   this.Actions = [];
}

Spa.prototype.GetSearch = function(url) 
{ 
   var link = $('<a>', { href: url});
   var query = link.prop('search');
   if(query)
      return new URLSearchParams(query);
   return null;
};

Spa.prototype.GetAction = function(url)
{
   for(var i = 0; i < this.Actions.length; i++)
   {
      var action = this.Actions[i];
      if(action.Checker(url))
         return action.Action;
   }
   return null;
};*/

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

//BasicSpa.prototype.CreateLink = function(url, text)
//{
//   //Assume url is partial: only the spa part?
//   url = window.location.href.split('?')[0] + url;
//   var element = $("<a></a>");
//   element.attr("href", url);
//   if(text) element.html(text);
//   return this.SetupClickable(element, url);
//};

//Create a clickable element that "brings you" to the given url. Also changes
//the url on the webpage (careful)
BasicSpa.prototype.SetupClickable = function(element, url)
{
   var me = this;
   element.click(function(event)
   {
      event.preventDefault();
      me.ProcessLink(url); //, element);
      history.pushState({"url" : url}, url, url);
   });
   return element;
};
