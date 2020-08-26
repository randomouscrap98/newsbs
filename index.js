var apiroot = "https://newdev.smilebasicsource.com/api";

var actiontext = {
   "c" : "Create",
   "r" : "Read",
   "u" : "Edit",
   "d" : "Delete"
};

var attr = {
   "pulsedate" : "data-maxdate"
};

//Will this be stored in user eventually?
var options = {
   pulseuserlimit : 10
};

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
      quickApi("user/register/sendemail", 
         () => log.Info("Registration email sent! Check your email"), 
         req => notifyError("There was a problem sending your email. However, your registration was submitted successfully."), 
         {"email" : formSerialize(registerform)["email"] });
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
         quickApi("user/basic", () => refreshUserFull(), undefined, 
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
      }, () => log.Debug("Cancelled invalidate tokens"));
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
      beforeSend: e => { e.headers["Authorization"] = "Bearer " + getToken(); },
      loadStart: e => { bar.removeAttribute('hidden'); bar.max = e.total; bar.value = e.loaded; },
      progress: e => { bar.max = e.total; bar.value = e.loaded; },
      loadEnd: e => { bar.max = e.total; bar.value = e.loaded; },
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
   refreshUserFull(() => rightpane.style.opacity = 1.0);

   //TODO: 

   //Call chain endpoint to get watches, aggregate activity, aggregate
   //comments, content just name/id, users just name/id/avatar. reset + fill
   //two sidebars with pulled data.

   var params = new URLSearchParams();
   var search = {"reverse":true,"createstart":Utilities.SubHours(24).toISOString()};
   params.append("requests", "activity-" + JSON.stringify(search));
   params.append("requests", "comment-" + JSON.stringify(search));
   params.append("requests", "content.0contentId.1parentId");
   params.append("requests", "user.0userId.1createUserId");
   params.set("comment","id,parentId,createUserId,createDate");
   params.set("content","id,name");
   params.set("user","id,username,avatar");

   //function quickApi(url, callback, error, postData, always, method)
   quickApi("read/chain?" + params.toString(), function(data)
   {
      console.log(data);
      updatePulse(data, true);
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

      fileuploadnewer.onclick = e => { e.preventDefault(); setFileUploadList(page - 1); }
      fileuploadolder.onclick = e => { e.preventDefault(); setFileUploadList(page + 1); }

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
      if(tag === "input" || tag === "textarea")
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
         error => formError(form, error.responseText || error.status), 
         formData,
         req => formEnd(form)
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

function idMap(data)
{
   var ds = {};
   for(var i = 0; i < data.length; i++)
      ds[data[i].id] = data[i];
   return ds;
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
   error = error || (e => notifyError("Error on " + url + ":\n" + e.status + " - " + e.responseText));

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

// ***************
// ---- Pulse ----
// ***************

function pulseId(content)
{
   return "pulseitem-" + content.id;
}

function getPulseUserlist(pulseitem)
{
   return pulseitem.querySelector(".pulse-users");
}

function makePulse(c)
{
   var pulsedata = cloneTemplate("pulse");
   pulsedata.id = pulseId(c);
   pulsedata.innerHTML = pulsedata.innerHTML
   .replace("%link%", "?p=" + c.id) //TODO: replace with actual linking service thing
   .replace(/%id%/g, c.id);
   return pulsedata;
}

function makePulseUser(user, message)
{
   var pu = cloneTemplate("pulseuser");
   pu.innerHTML = pu.innerHTML
      .replace(/%id%/g, user.id);
   Utilities.ReSource(pu, "data-src", 
      s => s.replace("%avatarlink%", getImageLink(user.avatar)));
   UIkit.util.on(pu.querySelector("[uk-dropdown]"), 'beforeshow', 
      e => refreshPulseUserDisplay(e.target));
   return pu;
}

var pulseUserFields = [ "create", "edit", "comment" ];

function getPulseUserData(userElem)
{
   var result = {};

   for(var i = 0; i < pulseUserFields.length; i++)
   {
      var elem = userElem.querySelector("[data-" + pulseUserFields[i] + "]");
      result[pulseUserFields[i]] = {
         "count" : Number(elem.getAttribute("data-count")),
         "lastdate" : elem.getAttribute("data-lastdate"),
         "firstdate" : elem.getAttribute("data-firstdate")
      };
   }

   return result;
}

function setPulseUserData(userElem, data)
{
   var maxparentdate=userElem.getAttribute(attr.pulsedate) || "0";
   for(var i = 0; i < pulseUserFields.length; i++)
   {
      var elem = userElem.querySelector("[data-" + pulseUserFields[i] + "]");
      var d = data[pulseUserFields[i]];
      elem.setAttribute("data-count", d.count);
      elem.setAttribute("data-lastdate", d.lastdate);
      elem.setAttribute("data-firstdate", d.firstdate);
      if(d.lastdate > maxparentdate) maxparentdate=d.lastdate;
      if(d.firstdate > maxparentdate) maxparentdate=d.firstdate;
   }
   userElem.setAttribute(attr.pulsedate, maxparentdate);
   userElem.previousSibling.setAttribute(attr.pulsedate, maxparentdate + " ");
}

function refreshPulseUserDisplay(userElem)
{
   var data = getPulseUserData(userElem); 
   var parent = false;
   for(var i = 0; i < pulseUserFields.length; i++)
   {
      var elem = userElem.querySelector("[data-" + pulseUserFields[i] + "]");
      if(!parent) parent = elem.parentNode;
      var d = data[pulseUserFields[i]];
      if(d && d.count)
      {
         elem.querySelector("td:first-child").textContent = d.count; 
            //(d.count > 1) ?  d.count : "";
         var dtmsg = [];
         if(d.lastdate) dtmsg.push(Utilities.TimeDiff(d.lastdate, null, true));
         if(d.firstdate) dtmsg.push(Utilities.TimeDiff(d.firstdate, null, true));
         elem.querySelector("td:last-child").textContent = dtmsg.join(" - ");
         elem.style = "";
      }
      else
      {
         elem.style.display = "none";
      }
   }
   Utilities.SortElements(parent, 
      x => x.getAttribute("data-lastdate") || x.getAttribute("data-firstdate") || "0", 
      true);
}

function cataloguePulse(c, u, aggregate)
{
   //Oops, never categorized this content
   if(!aggregate[c.id])
   {
      var pulsedata = document.getElementById(pulseId(c));

      if(!pulsedata)
      {
         pulsedata = makePulse(c);
         pulse.appendChild(pulsedata);
      }

      //Update the content name now, might as well
      var pelname = pulsedata.querySelector("[data-pulsename]");
      pelname[pelname.getAttribute("data-pulsename")] = c.name;

      aggregate[c.id] = { pulse : pulsedata };
   }

   //Oops, never categorized this user IN this content
   if(!aggregate[c.id][u.id])
   {
      var pulseuser = aggregate[c.id].pulse
         .querySelector('[data-pulseuser="' + u.id + '"]');

      if(!pulseuser)
      {
         var pu = makePulseUser(u, c);
         var pus = getPulseUserlist(aggregate[c.id].pulse);

         //Go find the user element (hoping it exists)
         [...pu.children].forEach(x => 
            {
               if(x.hasAttribute("data-pulseuser")) pulseuser = x;
               pus.appendChild(x);
            });
      }

      //Now pull the catalogue data FINALLY!
      aggregate[c.id][u.id] = getPulseUserData(pulseuser.nextSibling);
      aggregate[c.id][u.id].user = pulseuser.nextSibling;
   }

   return aggregate[c.id][u.id];
}

function applyPulseCatalogue(aggregate)
{
   for(key in aggregate)
   {
      if(Number(key))
      {
         for(key2 in aggregate[key])
            if(Number(key2))
               setPulseUserData(aggregate[key][key2].user, aggregate[key][key2]);

         //Sort userlist since we know exactly which contents we updated, we
         //don't want to sort EVERYTHING (think updates to only a single item
         //in the list)
         var pulseuserlist = getPulseUserlist(aggregate[key].pulse);
         Utilities.SortElements(pulseuserlist,
            x => x.getAttribute(attr.pulsedate) || "0", true);

         //Now update the maxdate on overall content
         aggregate[key].pulse.setAttribute(attr.pulsedate,
            pulseuserlist.firstElementChild.getAttribute(attr.pulsedate));
      }
   }
}

function updatePulseCatalogue(item, date)
{
   item.count++;

   if(item.count === 1) 
   {
      item.firstdate = date;
      return;
   }
   else if(item.count === 2) 
   {
      item.lastdate = date;
   }

   var lt = new Date(item.lastdate).getTime();
   var ft = new Date(item.firstdate).getTime();
   var dt = new Date(date).getTime();

   if(lt < ft)
   {
      var t = item.lastdate;
      item.lastdate = item.firstdate;
      item.firstdate = t;
   }

   if(dt > lt)
      item.lastdate = date;
   if(dt < ft)
      item.firstdate = date;
}

function updatePulse(data, fullReset)
{
   if(fullReset)
      pulse.innerHTML = "";

   //Easy dictionaries
   var users = idMap(data.user);
   var contents = idMap(data.content);
   var aggregate = {};

   for(var i = 0; i < data.comment.length; i++)
   {
      var c = data.comment[i];
      if(c.createUserId) //need to check in case deleted comment
      {
         var d = cataloguePulse(contents[c.parentId], users[c.createUserId], aggregate);
         updatePulseCatalogue(d.comment, c.createDate);
      }
   }

   for(var i = 0; i < data.activity.length; i++)
   {
      var a = data.activity[i];
      if(a.userId > 0) //need to check in case system
      {
         var d = cataloguePulse(contents[a.contentId], users[a.userId], aggregate);

         if(a.action == "c")
            updatePulseCatalogue(d.create, a.date);
         else if(a.action == "u")
            updatePulseCatalogue(d.edit, a.date);
      }
   }

   applyPulseCatalogue(aggregate);

   Utilities.SortElements(pulse,
      x => x.getAttribute(attr.pulsedate) || "0", true);

   refreshPulseDates();
}

function refreshPulseDate(pulseitem)
{
   var timediff = Utilities.TimeDiff(pulseitem.getAttribute(attr.pulsedate));
   if(timediff.indexOf("now") < 0)
      timediff += " ago";
   pulseitem.querySelector(".pulse-time").innerHTML = timediff;
}

function refreshPulseDates()
{
   [...pulse.children].forEach(x => refreshPulseDate(x));
}
