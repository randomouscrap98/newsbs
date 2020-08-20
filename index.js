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
   setupAlerts();

   setupTests(); //For now

   if(getToken())
      setupNewSession();
};

function setupTests()
{
   quickApi("user", function(users)
   {
      var tests = [
      { "name" : "Hello world!", "link" : "whatever" },
      { "name" : "This is a very long title. It is VERY VERY LONG!!! I don't want it to wrap", "link" : "uhuh" },
      { "name" : "And one more thing!", "link" : "yes" },
      { "name" : "Off topic!", "link" : "yes" },
      { "name" : "S U P R E M E C H A T", "link" : "yes" } ];

      for(var i = 0; i < tests.length; i++)
      {
         var t = tests[i];
         var p = cloneTemplate("pulse");
         p.innerHTML = p.innerHTML
            .replace("%name%", t.name)
            .replace("%link%", t.link)
            .replace(/%id%/g, i)
            .replace(/%date%/g, (new Date()).toLocaleString());
         for(var j = 0; j < i * 2 + 1; j++)
         {
            p.querySelector(".pulse-users").appendChild(
               makePulseUser(users[Math.floor(Math.random() * users.length)], "comment", "Comment"));
         }
         pulse.appendChild(p);
      }
   });
}

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
   formSetupSubmit(loginform, "user/authenticate", function(token)
   {
      setToken(token); 
      setupNewSession();
   });
   userlogout.addEventListener("click", function()
   {
      setToken(null);
      setLoginState(false);
   });
   formSetupSubmit(passwordresetform, "user/passwordreset/sendemail", function(result)
   {
      log.Info("Password reset code sent!");
      passwordresetstep2.click();
   });
   formSetupSubmit(passwordresetconfirmform, "user/passwordreset", function(token)
   {
      notifySuccess("Password reset!");
      setToken(token); 
      refreshUserFull();
   }, function(formData)
   {
      if(formData.password != formData.password2)
         return "Passwords don't match!"
      return undefined;
   });
   formSetupSubmit(registerform, "user/register", function(token)
   {
      log.Info("Registration submitted! Sending email...");
      quickApi("user/register/sendemail", function()
      {
         log.Info("Registration email sent! Check your email");
      }, function(req)
      {
         notifyError("There was a problem sending your email. However, your registration was submitted successfully.");
      }, {"email" : formSerialize(registerform)["email"] });
      registrationstep2.click();
   }, function(formData)
   {
      if(formData.password != formData.password2)
         return "Passwords don't match!"
      return undefined;
   });
   formSetupSubmit(registerconfirmform, "user/register/confirm", function(token)
   {
      notifySuccess("Registration complete!");
      setToken(token); 
      refreshUserFull();
   });

   userchangeavatar.addEventListener("click", function() {
      fileselectcallback = function(id) {
         quickApi("user/basic", function() { refreshUserFull() }, undefined, 
            { "avatar" : id }, undefined, "PUT"); 
      };
   });
}

function setupAlerts()
{
   userinvalidatesessions.addEventListener("click", function(e)
   {
      e.preventDefault();

      UIkit.modal.confirm("This will force ALL sessions EVERYWHERE to be invalid, " + 
         "you will need to log back in to ALL devices. This is useful if you believe " +
         "someone has stolen your session token. Are you SURE you want to do this?").then(function()
      {
         quickApi("user/invalidatealltokens", function() 
         { 
            setToken(null);
            location.reload(); 
         }, undefined, "pleaseinvalidate");
      }, function() { log.Debug("Cancelled invalidate tokens"); });
   });
}

fileselectcallback = false;

function setupFileUpload()
{
   UIkit.util.on('#fileupload', 'beforeshow', function () {
      log.Debug("File upload shown, refreshing images");
      setFileUploadList(0);
   });

   //this is the "dynamic loading" to save data: only load big images when
   //users click on them
   UIkit.util.on("#fileuploadslideshow", "beforeitemshow", function(e) {
      e.target.firstElementChild.src = e.target.firstElementChild.getAttribute("data-src");
   });

   fileuploadselect.addEventListener("click", function()
   {
      //Find the selected image
      var selectedImage = document.querySelector("#fileuploadthumbnails li.uk-active");

      //Call the "function" (a global variable! yay!)
      if(fileselectcallback)
      {
         //for safety, remove callback
         fileselectcallback(selectedImage.getAttribute("data-id"));
         fileselectcallback = false;
      }
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

//Assuming the user is logged in, this will start up the long poller, set the
//login state, etc.
function setupNewSession()
{
   log.Info("User token found, trying to continue logged in");
   rightpane.style.opacity = 0.2;
   refreshUserFull(function() { rightpane.style.opacity = 1.0; });

   //TODO: 

   //Call chain endpoint to get watches, aggregate activity, aggregate
   //comments, content just name/id, users just name/id/avatar. reset + fill
   //two sidebars with pulled data.

   var params = new URLSearchParams();
   var search = {"reverse":true,"createstart":yesterday().toISOString()};
   params.append("requests", "activity-" + JSON.stringify(search));
   params.append("requests", "comment-" + JSON.stringify(search));
   params.set("comment","id,parentId,createUserId,createDate");

   //function quickApi(url, callback, error, postData, always, method)
   quickApi("read/chain?" + params.toString(), function(data)
   {
      console.log(data);
   });

   //Start long poller
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
   navuseravatar.src = getAvatarLink(user.avatar, 80);
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
   }, function(req)
   {
      //Assume any failed user refresh means they're logged out
      log.Error("Couldn't refresh user, deleting cached token");
      setToken(null);   
      setLoginState(false);
   }, undefined, always);
}

var displayLimit = 40;

function setFileUploadList(page)
{
   fileuploaditems.innerHTML = "<div uk-spinner='ratio: 3'></div>";
   fileuploadthumbnails.innerHTML = "";

   quickApi("file?reverse=true&limit=" + displayLimit + "&skip=" + (displayLimit * page) +
      "&createuserids=" + getUserId(), function(files)
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
   var link = getImageLink(file.id);
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

function getImageLink(id, size, crop)
{
   var img = apiroot + "/file/raw/" + id;
   var linkch = "?";
   if(size) { img += linkch + "size=" + size; linkch = "&"; }
   if(crop) { img += linkch + "crop=true"; linkch = "&"; }
   return img;
}

function getAvatarLink(id, size)
{
   return getImageLink(id, size, true);
}

function yesterday()
{
   var d = new Date();
   d.setDate(d.getDate() - 1);
   return d;
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

function formSetupSubmit(form, endpoint, success, validate)
{
   form.addEventListener("submit", function(event)
   {
      event.preventDefault();
      formStart(form);

      var formData = formSerialize(form);
      if(validate) 
      {
         var error = validate(formData);
         if(error) 
         { 
            formError(form, error); 
            formEnd(form);
            return; 
         }
      }

      quickApi(endpoint, success,
         function(error) { formError(form, error.responseText || error.status); }, 
         formData,
         function(req) { formEnd(form); }
      );
   });
}

function notifyBase(message, icon, status)
{
   UIkit.notification({
      "message": "<span class='uk-flex uk-flex-middle'><span uk-icon='icon: " +
         icon + "; ratio: 1.4' class='uk-text-" + status + 
         "'></span><span class='uk-flex-1 uk-text-break notification-actual'>" + message + "</span></span>", 
      "pos":"bottom-right"
   });
}

function notifyError(error)
{
   log.Error(error);
   notifyBase(error, "close", "danger");
}

function notifySuccess(message)
{
   log.Info("Notify: " + message);
   notifyBase(message, "check", "success");
}

function makePulseUser(user, icon, type)
{
   var pu = cloneTemplate("pulseuser");
   pu.innerHTML = pu.innerHTML
      .replace("%message%", type + ": " + user.username)
      .replace("%icon%", icon);
   pu.firstElementChild.src = pu.firstElementChild.getAttribute("data-src")
      .replace("%avatarlink%", getImageLink(user.avatar));
   return pu;
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

function quickApi(url, callback, error, postData, always, method)
{
   let thisreqid = ++reqId;
   url = apiroot + "/" + url;
   error = error || function(e) { notifyError("Error on " + url + ":\n" + e.status + " - " + e.responseText); };

   method = method || (postData ? "POST" : "GET");
   log.Info("[" + thisreqid + "] " + method + ": " + url);

   var req = new XMLHttpRequest();
   req.addEventListener("loadend", function()
   {
      log.Debug("[" + thisreqid + "]: " + req.status + " " + req.statusText + 
         " (" + req.response.length + "b)");
      if(always) 
         always(req);
      if(req.status <= 299 && req.status >= 200)
      {
         if(callback)
            callback(req.responseText ? JSON.parse(req.responseText) : null);
         else
            notifySuccess("Success: " + req.status + " - " + req.responseText);
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
