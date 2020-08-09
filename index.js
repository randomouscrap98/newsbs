var apiroot = "https://newdev.smilebasicsource.com/api";

window.onload = function()
{
   log.Info("Window load event");

   var ww = Utilities.ConvertRem(Utilities.WindowWidth());
   log.Debug("Width REM: " + ww);

   if(ww >= 60)
      rightpanetoggle.click();

   setupDebugLog();
   setupTechnicalInfo();
   setupUserForms();
};

// ********************
// ---- SETUP CODE ----
// ********************

function setupDebugLog()
{
   UIkit.util.on('#logsparent', 'show', function () {
      //Find the last id, only display new ones.
      log.Debug("Debug log shown, rendering new messages");
      var lastId = (logs.lastElementChild ?  Number(logs.lastElementChild.dataset.id) : 0);
      var msgBase = document.querySelector("#templates [data-log]");
      for(var i = 0; i < log.messages.length; i++)
      {
         if(log.messages[i].id > lastId)
         {
            var logMessage = msgBase.cloneNode(true);
            logMessage.innerHTML = logMessage.innerHTML
               .replace("%message%", log.messages[i].message)
               .replace("%level%", log.messages[i].level)
               .replace("%time%", log.messages[i].time);
            logMessage.setAttribute("data-id", log.messages[i].id);
            logs.appendChild(logMessage);
         }
      }
   });
}

function setupTechnicalInfo()
{
   quickApi("test/info", function(data)
   {
      technicalinfo.innerHTML = technicalinfo.innerHTML
         .replace("%apiroot%", apiroot)
         .replace("%apiversion%", data.versions.contentapi)
         .replace("%entitysystemversion%", data.versions.entitysystem);
   });
}

function setupUserForms()
{
   loginform.addEventListener("submit", function(event)
   {
      event.preventDefault();
      formStart(loginform);
      setTimeout(function()
      {
         formEnd(loginform);
         formError(loginform, "You suck");
      }, 3000);
   });
}

// ***************************
// ---- GENERAL UTILITIES ----
// ***************************

function getToken()
{
   var token = window.localStorage.getItem("usertoken");
   if(!token) return undefined;
   return JSON.parse(token);
}

function setToken(token)
{
   window.localStorage.setItem("usertoken", JSON.stringify(token));
}

function getFormInputs(form)
{
   return form.querySelectorAll("input, textarea, button, select");
}

function formStart(form)
{
   var inputs = getFormInputs(form);
   for(var i = 0; i < inputs.length; i++)
      inputs[i].setAttribute("disabled", "");
   var submit = form.querySelector("[type='submit']");
   submit.parentNode.appendChild(cloneTemplate("spinner"));
   var errors = form.querySelectorAll("[data-error]");
   for(var i = 0; i < errors.length; i++)
      errors[i].parentNode.removeChild(errors[i]);
}

function formEnd(form)
{
   var inputs = getFormInputs(form);
   for(var i = 0; i < inputs.length; i++)
      inputs[i].removeAttribute("disabled");
   var submit = form.querySelector("[type='submit']");
   submit.parentNode.removeChild(submit.parentNode.querySelector("[data-spinner]"));
}

function formError(form, error)
{
   form.appendChild(makeError(error));
}

// ***********************
// ---- TEMPLATE CRAP ----
// ***********************

function cloneTemplate(name)
{
   return document.querySelector("#templates [data-" + name + "]").cloneNode(true);
}

function makeError(message)
{
   var error = cloneTemplate("error");
   error.innerHTML = error.innerHTML.replace("%message%", message);
   return error;
}

// *************
// ---- API ----
// *************

var reqId = 0;

function quickApi(url, callback, error, postData)
{
   thisreqid = ++reqId;
   url = apiroot + "/" + url;
   error = error || function(e) { alert("Error on " + url + ":\n" + e.status + " - " + e.responseText); };

   var method = postData ? "POST" : "GET";
   log.Info("[" + thisreqid + "] " + method + ": " + url);

   var req = new XMLHttpRequest();
   req.addEventListener("loadend", function()
   {
      log.Debug("[" + thisreqid + "]: " + req.status);
      if(req.status <= 299 && req.status >= 200)
      {
         if(callback)
            callback(req.responseText ? JSON.parse(req.responseText) : null);
         else
            alert("Success: " + req.status + " - " + req.responseText);
      }
      else
      {
         error(req);
      }
   });

   req.open(method, url);
   req.setRequestHeader("accept", "application/json");
   req.setRequestHeader("Content-Type", "application/json");

   var token = getToken(); //Do this as late as possible "just in case" (it makes no difference though)
   if(token)
      req.setRequestHeader("Authorization", "Bearer " + token);

   if(postData)
      req.send(JSON.stringify(postData));
   else
      req.send();
}
