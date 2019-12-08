//Carlos Sanchez
//9-15-2019
//Deps: jquery, constants


//You must pass a logger, or else provide a garbage object with empty
//functions.
function Requests(logger)
{
   this.Log = logger;
}

//Authorization stuff
Requests.prototype.GetAuthToken = function() { return localStorage.getItem("auth"); };
Requests.prototype.SetAuthToken = function(token) { localStorage.setItem("auth", token); };
Requests.prototype.RemoveAuthToken = function() { localStorage.removeItem("auth"); };

//Turn the url and data into ajax settings (don't run any ajax yet)
Requests.prototype.GetAjaxSettings = function(url, data)
{
   var settings = {
      url : url,
      contentType: 'application/json',
      dataType: 'json',
      headers: {
         "Accept" : "application/json" //WE only accept json. The endpoint should provide this...
      }
   };

   var auth = this.GetAuthToken();

   if(auth) 
      settings.headers["Authorization"] = "Bearer " + auth;

   if(data !== undefined)
   {
      settings.method = "POST";
      settings.data = JSON.stringify(data);
   }
   else
   {
      settings.method = "GET";
   }

   return settings;
};

//Run a basic Ajax post/get and return the ajax object. This logs data and does
//whatever else EVERY request should do
Requests.prototype.RunBasicAjax = function(url, data)
{
   var me = this;
   return $.ajax(this.GetAjaxSettings(url, data)).done(function(data)
   {
      me.Log.Debug(url + " SUCCESS: " + JSON.stringify(data));
   }).fail(function(data)
   {
      if(data && data.responseText && data.responseJSON)
         data.responseText = undefined;
      me.Log.Warn(url + " FAIL: " + JSON.stringify(data));
   });
};

//Convert response (from jquery ajax) into a list of errors.
Requests.prototype.GetResponseErrors = function(response)
{
   var errors = [];

   if(response.responseJSON && response.responseJSON.errors)
   {
      var rErrors = response.responseJSON.errors;

      for(var k in rErrors) 
         if(rErrors.hasOwnProperty(k))
            errors = errors.concat(rErrors[k]);
   }
   else if(response.responseJSON && $.type(response.responseJSON) === "string")
   {
      errors.push(response.responseJSON);
   }
   else if(response.responseText)
   {
      errors.push(response.responseText);
   }
   else if(response.statusText)
   {
      var message = response.statusText;
      if(response.status)
         message = String(response.status) + ": " + message;
      errors.push(message);
   }

   return errors;
};

Requests.prototype.GetMe = function(callback)
{
   if(!this.GetAuthToken())
   {
      callback(null);
      return;
   }

   var ajax = this.RunBasicAjax(API.UserMe);
   ajax.fail(function(){ callback(null); });
   ajax.done(function(data) { callback(data); });
};

Requests.prototype.GetCategories = function(level, callback)
{
   var ajax = this.RunBasicAjax(API.Categories + "?parentId=" + level);
   ajax.fail(function(){ callback(null); }); //This may not be good
   ajax.done(function(data) { callback(data); });
};

Requests.prototype.GetMasterCategory = function(callback)
{
   var me = this;

   if(me.MasterCategory)
   {
      callback(me.MasterCategory);
      return;
   }
   
   var innerCall = function(data)
   {
      var results = data["collection"];
      for(var i = 0; i < results.length; i++)
      {
         if(results[i]["name"] == WEBSITE.MasterCategory)
         {
            me.Log.Info("Master category: " + results[i]["name"] + 
                        " (" + results[i]["id"] + ")");
            me.MasterCategory = results[i];
            callback(results[i]);
            return;
         }
      }
      callback(null); //Is this REEAALLLY ok???
   };

   me.GetCategories(-1, innerCall);
};
