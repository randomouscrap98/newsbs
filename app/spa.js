//Carlos Sanchez
//11-9-2019

function SpaAction(checker, action)
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
};
