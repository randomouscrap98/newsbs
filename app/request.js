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
   return $.ajax(GetAjaxSettings(url, data)).done(function(data)
   {
      this.Log.Debug(url + " SUCCESS: " + JSON.stringify(data));
   }).fail(function(data)
   {
      if(data && data.responseText && data.responseJSON)
         data.responseText = undefined;
      this.Log.Warn(url + " FAIL: " + JSON.stringify(data));
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
   else
   {
      errors.push(response.responseText);
   }

   return errors;
};

