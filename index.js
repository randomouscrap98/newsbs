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
   setupFileUpload();

   if(getToken())
   {
      log.Info("User token found, trying to continue logged in");
      rightpane.style.opacity = 0.2;
      refreshUserFull(function() { rightpane.style.opacity = 1.0; });
   }
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
      quickApi("user/authenticate", 
         function(token) { setToken(token); refreshUserFull(); }, 
         function(error) { formError(loginform, error.responseText || error.status); }, 
         formSerialize(loginform), 
         function(req) { formEnd(loginform); }
      );
   });
   userlogout.addEventListener("click", function()
   {
      setToken(null);
      setLoginState(false);
   });
}

function setupFileUpload()
{
   UIkit.util.on('#fileupload', 'beforeshow', function () {
      log.Debug("File upload shown, refreshing images");
      setFileUploadList(0);
   });

   UIkit.util.on("#fileuploadslideshow", "beforeitemshow", function(e) {
      e.target.firstElementChild.src = e.target.firstElementChild.getAttribute("data-src");
      //console.log(e);
   });

   var bar = fileuploadprogress;
   var generalError = function () {
      if(typeof arguments[0] == 'XMLHttpRequest')
         formError(fileuploadform, arguments[0].status + ": " + arguments[0].message);
      else
         formError(fileuploadform, arguments[0]);
      bar.setAttribute('hidden', 'hidden');
   };

   UIkit.upload('#fileuploadform', {
      url: apiroot + '/file',
      multiple: false,
      mime: "image/*",
      name: "file",
      beforeSend: function (e) { e.headers["Authorization"] = "Bearer " + getToken(); },
      loadStart: function (e) { bar.removeAttribute('hidden'); bar.max = e.total; bar.value = e.loaded; },
      progress: function (e) { bar.max = e.total; bar.value = e.loaded; },
      loadEnd: function (e) { bar.max = e.total; bar.value = e.loaded; },
      error: generalError,
      fail: generalError,
      completeAll: function () {
         console.log(arguments);
         log.Info("Upload complete");
         addFileUploadImage(JSON.parse(arguments[0].responseText), fileuploaditems.childElementCount);
         setTimeout(function () { 
            bar.setAttribute('hidden', 'hidden'); 
            fileuploadthumbnails.lastElementChild.firstElementChild.click();
         }, 200);
      }
   });
}

// **********************
// ---- Page Modify ----
// **********************

function setLoginState(loggedIn)
{
   //check current login state. User is logged in if first element (the user
   //login section) is hidden.
   var currentState = rightpanenav.firstElementChild.hasAttribute("hidden");

   //Force an inverted state if the state isn't the same. Definitely room for
   //timing errors here but egh whatever, sorry users (for now).
   if(currentState != loggedIn)
   {
      toggleuserstate.click();
   }
}

function updateUserData(user)
{
   //Just username and avatar for now?
   navuseravatar.src = apiroot + "/file/raw/" + user.avatar + "?crop=true&size=80";
   userusername.textContent = user.username;
   userid.textContent = "User ID: " + user.id;
   userid.setAttribute("data-userid", user.id);
   //Check fields in user for certain special fields like email etc.
}

function refreshUserFull(always)
{
   //Make an API call to /me to get the latest data.
   quickApi("user/me", function(user)
   {
      updateUserData(user);
      setLoginState(true);
   }, undefined, undefined, always);
}

var displayLimit = 40;

function setFileUploadList(page)
{
   fileuploaditems.innerHTML = "<div uk-spinner='ratio: 3'></div>";
   fileuploadthumbnails.innerHTML = "";

   quickApi("file?reverse=true&limit=" + displayLimit + "&skip=" + (displayLimit * page) +
      "&createuseridsf=" + getUserId(), function(files)
   {
      fileuploaditems.innerHTML = "";
      for(var i = 0; i < files.length; i++)
      {
         addFileUploadImage(files[i], i);
      }

      fileuploadnewer.onclick = function(e) { e.preventDefault(); setFileUploadList(page - 1); }
      fileuploadolder.onclick = function(e) { e.preventDefault(); setFileUploadList(page + 1); }

      if(page > 0) fileuploadnewer.removeAttribute("hidden");
      else fileuploadnewer.setAttribute("hidden", "");
      if(files.length == displayLimit) fileuploadolder.removeAttribute("hidden");
      else fileuploadolder.setAttribute("hidden", "");
   });
}

function addFileUploadImage(file, num)
{
   var link = apiroot + "/file/raw/" + file.id;
   var fItem = cloneTemplate("fupmain");
   fItem.innerHTML = fItem.innerHTML.replace("%link%", link);
   var fThumb = cloneTemplate("fupthumb");
   fThumb.innerHTML = fThumb.innerHTML.replace("%link%", link);
   fThumb.setAttribute("uk-slideshow-item", num);
   fThumb.setAttribute("data-id", file.id);
   fileuploaditems.appendChild(fItem);
   fileuploadthumbnails.appendChild(fThumb);
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
   if(token)
      token = JSON.stringify(token);
   window.localStorage.setItem("usertoken", token);
}

function getUserId()
{
   return userid.dataset.userid;
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
   log.Error(error);
}

function formSerialize(form)
{
   //TRY to get inputs by name, get values based on what kind they are.
   var inputs = form.querySelectorAll("[name]");
   var result = {};
   for(var i = 0; i < inputs.length; i++)
   {
      var tag = inputs[i].tagName.toLowerCase();
      if(tag == "input")
         result[inputs[i].getAttribute("name")] = inputs[i].value;
   }
   return result;
}

function notifyError(error)
{
   log.Error(error);
   alert(error); //change this at some point?
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

function makeSuccess(message)
{
   var success = cloneTemplate("success");
   success.innerHTML = success.innerHTML.replace("%message%", message);
   return success;
}

// *************
// ---- API ----
// *************

var reqId = 0;

function quickApi(url, callback, error, postData, always)
{
   thisreqid = ++reqId;
   url = apiroot + "/" + url;
   error = error || function(e) { notifyError("Error on " + url + ":\n" + e.status + " - " + e.responseText); };

   var method = postData ? "POST" : "GET";
   log.Info("[" + thisreqid + "] " + method + ": " + url);

   var req = new XMLHttpRequest();
   req.addEventListener("loadend", function()
   {
      log.Debug("[" + thisreqid + "]: " + req.status);
      if(always) 
         always(req);
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
