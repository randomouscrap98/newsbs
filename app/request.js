//Carlos Sanchez
//9-15-2019
//Deps: jquery 

function GetAuthToken() { return localStorage.getItem("auth"); }
function SetAuthToken(token) { localStorage.setItem("auth", token); }

function GetAjaxSettings(url, data)
{
   var settings = {
      url : url,
      contentType: 'application/json',
      dataType: 'json',
      headers: {
         "Accept" : "application/json" //WE only accept json. The endpoint should provide this...
      }
   };

   var auth = GetAuthToken();
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
}

function GetResponseErrors(response)
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
}

