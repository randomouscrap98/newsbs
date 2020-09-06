var apiroot = "https://newdev.smilebasicsource.com/api";

var actiontext = {
   "c" : "Create",
   "r" : "Read",
   "u" : "Edit",
   "d" : "Delete"
};

var attr = {
   "pulsedate" : "data-maxdate",
   "pulsecount" : "data-pwcount"
};

//Will this be stored in user eventually?
var options = {
   pulseuserlimit : 10,
   refreshcycle : 10000,
   datalog : false
};

var globals = {};

console.datalog = function(d)
{
   if(options.datalog)
      console.log(d);
};

window.onload = function()
{
   log.Info("Window load event");

   var ww = Utilities.ConvertRem(Utilities.WindowWidth());
   log.Debug("Width REM: " + ww);

   if(ww >= 60)
      rightpanetoggle.click();

   setupSpa();

   setupDebugLog();
   setupTechnicalInfo();
   setupUserForms();
   setupFileUpload();
   setupAlerts();
   setupPageControls();

   if(getToken())
      setupNewSession();

   spa.ProcessLink(document.location.href);
   globals.refreshCycle = setInterval(refreshCycle, options.refreshcycle);
};

function refreshCycle()
{
   refreshPWDates(pulse);
   refreshPWDates(watches);
}

// ********************
// ---- SETUP CODE ----
// ********************

var spa = false;

function setupSpa()
{
   spa = new BasicSpa(log);

   //For now, we have ONE processor!
   spa.Processors.push(new SpaProcessor(url => true, function(url)
   {
      var pVal = Utilities.GetParams(url).get("p") || "home"; 
      var pParts = pVal.split("-");
      var route = "route" + pParts[0];
      var template;

      try
      {
         template = cloneTemplate(route);
      }
      catch
      {
         log.Error("Couldn't find route " + url);
         route = "routeerror";
         template = cloneTemplate(route);
      }

      initializePage();
      maincontent.appendChild(template);

      if(window[route + "_load"])
         window[route + "_load"](url, pVal, pParts[1]);
      else
         finalizePage();
   }));

   spa.SetHandlePopState();
}

function setupDebugLog()
{
   UIkit.util.on('#logsparent', 'show', function () {
      //Find the last id, only display new ones.
      log.Debug("Debug log shown, rendering new messages");
      var lastId = (logs.lastElementChild ?  Number(logs.lastElementChild.dataset.id) : 0);
      var msgBase = cloneTemplate("log");
      for(var i = 0; i < log.messages.length; i++)
      {
         if(log.messages[i].id > lastId)
         {
            var logMessage = msgBase.cloneNode(true);
            multiSwap(logMessage, {
               "data-message": log.messages[i].message,
               "data-level": log.messages[i].level,
               "data-time": log.messages[i].time,
               "data-id": log.messages[i].id
            });
            logs.appendChild(logMessage);
         }
      }
   });
}

function setupTechnicalInfo()
{
   quickApi("test/info", function(data)
   {
      multiSwap(technicalinfo, {
         "data-apiroot": apiroot,
         "data-apiversion": data.versions.contentapi,
         "data-entitysystemversion": data.versions.entitysystem
      });
   });
}

function setupPageControls()
{
   var makeSet = f => function(event)
   {
      event.preventDefault();
      f();
   };

   fulldiscussionmode.onclick = makeSet(setFullDiscussionMode);
   fullcontentmode.onclick = makeSet(setFullContentMode);
   splitmodecontent.onclick = makeSet(setSplitMode);
   splitmodediscussion.onclick = makeSet(setSplitMode);
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
      //stopSession();
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

   var params = new URLSearchParams();
   var search = {"reverse":true,"createstart":Utilities.SubHours(24).toISOString()};
   var watchsearch = {"ContentLimit":{"Watches":true}};
   params.append("requests", "comment-" + JSON.stringify(search));
   //search.type ="content"; //Add more restrictions for activity
   params.append("requests", "activity-" + JSON.stringify(search));
   params.append("requests", "watch");
   params.append("requests", "commentaggregate-" + JSON.stringify(watchsearch));
   params.append("requests", "activityaggregate-" + JSON.stringify(watchsearch));
   params.append("requests", "content.1contentId.0parentId.2contentId");
   params.append("requests", "user.1userId.0createUserId.3userIds.4userIds");
   params.set("comment","id,parentId,createUserId,createDate");
   params.set("content","id,name");
   params.set("user","id,username,avatar");
   params.set("watch","id,contentId,lastNotificationId");

   quickApi("read/chain?" + params.toString(), function(data)
   {
      console.datalog(data);
      updatePulse(data, true);
      displayNewWatches(data, true);
   });

   //Start long poller
}

function stopSession()
{
   setLoginState(false);

   //Reload current page
   spa.ProcessLink(document.location.href);

   //Abort long poller
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
   userusername.firstElementChild.textContent = user.username;
   userusername.href = getUserLink(user.id);
   userid.textContent = "User ID: " + user.id;
   //Can't use findSwap: it's an UPDATE
   userid.setAttribute("data-userid", user.id);
   finalizeTemplate(userusername);
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
   var fItem = cloneTemplate("fupmain");
   var fThumb = cloneTemplate("fupthumb");
   multiSwap(fItem, { "data-src": getImageLink(file.id) });
   multiSwap(fThumb, {
      "data-src": getImageLink(file.id, 60, true),
      "data-number": num,
      "data-id": file.id
   });
   fileuploaditems.appendChild(fItem);
   fileuploadthumbnails.appendChild(fThumb);
}

function updateGlobalAlert()
{
   if(watchglobalalert.textContent)
   {
      globalalert.style = "";
   }
   else
   {
      globalalert.style.display = "none";
   }
}

function initializePage()
{
   log.Debug("Clearing breadcrumbs on pageload");

   //Clear out the breadcrumbs
   while(breadcrumbs.lastElementChild !== breadcrumbs.firstElementChild)
   {
      breadcrumbs.removeChild(breadcrumbs.lastElementChild);
   }

   //Go find the discussion, move it to the hidden zone.
   //var discussions = maincontent.querySelectorAll("[data-discussion]");
   //[...discussions].forEach(x =>
   //{
   //   log.Info("Moving discussion '" + x.getAttribute("data-id") + "' to hidden element for storage");
   //   memory.appendChild(x);
   //});

   maincontent.innerHTML = "";
   maincontentinfo.innerHTML = "";
   maincontentloading.removeAttribute("hidden");
   setHasDiscussions(false);
}

function makeBreadcrumbs(chain)
{
   chain.forEach(x =>
   {
      var bc = cloneTemplate("breadcrumb");
      multiSwap(bc, {
         "data-link" : x.content ? getPageLink(x.id) : getCategoryLink(x.id),
         "data-text" : x.name
      });
      finalizeTemplate(bc);
      breadcrumbs.appendChild(bc);
   });
}

function finalizePage()
{
   //We HOPE the first spinner is the one we added. Fix this later!
   //maincontent.removeChild(maincontent.querySelector("[data-spinner]"));
   maincontentloading.setAttribute("hidden", "");
}

function setFullContentMode()
{
   unhide(maincontentcontainer);
   unhide(splitmodediscussion);
   maincontentcontainer.className += " uk-flex-1";

   hide(discussionscontainer);
   hide(splitmodecontent);
   hide(fulldiscussionmode);
   hide(fullcontentmode);
}

function setFullDiscussionMode()
{
   unhide(discussionscontainer);
   unhide(splitmodecontent);

   hide(maincontentcontainer);
   hide(splitmodediscussion);
   hide(fulldiscussionmode);
   hide(fullcontentmode);
}

function setSplitMode()
{
   maincontentcontainer.className = 
      maincontentcontainer.className.replace(/uk-flex-1/g, ""); 
   unhide(discussionscontainer);
   unhide(maincontentcontainer);
   unhide(fulldiscussionmode);
   unhide(fullcontentmode);

   hide(splitmodecontent);
   hide(splitmodediscussion);
}

function setHasDiscussions(has)
{
   if(has)
   {
      unhide(maincontentbar);
      setSplitMode(); //Could be settings?
   }
   else
   {
      hide(maincontentbar);
      setFullContentMode();
   }
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

function hide(e) { e.setAttribute("hidden", ""); }
function unhide(e) { e.removeAttribute("hidden"); }

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

function getUserLink(id) { return "?p=user-" + id; }
function getPageLink(id) { return "?p=page-" + id; }
function getCategoryLink(id) { return "?p=category-" + id; }

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
   data = data || [];
   var ds = {};
   for(var i = 0; i < data.length; i++)
      ds[data[i].id] = data[i];
   return ds;
}

function getSwapElement(element, attribute)
{
   if(element.hasAttribute(attribute))
      return element;

	return element.querySelector("[" + attribute + "]");
}

//How does this work?
//-Find an element by (assumed unique) attribute
//-If attribute is empty, that is what is assigned
//-If attribute has a value, the replacement goes to where the attribute is
// pointing
//-If attribute starts with ., it goes to the MEMBER on the element.
// If element doesn't have that member, try global function
function swapBase(element, attribute, replace)
{
   try
   {
      var name = getSwapElement(element, attribute);
      var caller = name.getAttribute(attribute);

      //Oops, use the direct attribute if there's no value.
      if(!caller)
         caller = attribute;

      //Oh, it's a function call! Try on the element itself first, then fall
      //back to the window functions
      if(caller.indexOf(".") === 0)
      {
         caller = caller.substr(1);

         if(caller in name)
         {
            if(replace !== undefined)
               name[caller] = replace;
            else
               return name[caller];
         }
         else
         {
            return window[caller](name, replace);
         }
      }
      else
      {
         if(replace !== undefined)
            name.setAttribute(caller, replace);
         else
            return name.getAttribute(caller);
      }
   }
   catch(ex)
   {
      log.Error("Can't swap attribute " + attribute + " on element " + element
         + " : " + ex);
   }
}

function findSwap(element, attribute, replace)
{
   swapBase(element, attribute, replace);
}

function multiSwap(element, replacements)
{
   for(key in replacements)
      findSwap(element, key, replacements[key]);
}

function getSwap(element, attribute)
{
   return swapBase(element, attribute);
}

function getChain(categories, content)
{
   //work backwards until there's no parent id
   var crumbs = [ content ];
   var cs = idMap(categories);

   while(crumbs[0].parentId)
      crumbs.unshift(cs[crumbs[0].parentId]);

    return crumbs;
}

// ***********************
// ---- TEMPLATE CRAP ----
// ***********************

function cloneTemplate(name)
{
   var elm = document.querySelector("#templates [data-" + name + "]").cloneNode(true);
   return elm;
}

function finalizeTemplate(elm)
{
   var links = elm.querySelectorAll("[data-spa]");
   [...links].forEach(x =>
   {
      x.onclick = spa.ClickFunction(x.href);
   });
   if(elm.hasAttribute("data-spa"))
      elm.onclick = spa.ClickFunction(elm.href);
   return elm;
}

function makeError(message)
{
   var error = cloneTemplate("error");
   findSwap(error, "data-message", message);
   return error;
}

function makeSuccess(message)
{
   var success = cloneTemplate("success");
   findSwap(error, "data-message", message);
   return success;
}

function makeStandardContentInfo(content, users)
{
   var info = cloneTemplate("stdcontentinfo");
   multiSwap(info, {
      "data-createavatar" : getAvatarLink(users[content.createUserId].avatar, 20),
      "data-createlink" : getUserLink(content.createUserId),
      "data-createdate" : (new Date(content.createDate)).toLocaleString()
   });
   finalizeTemplate(info);
   return info;
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


// *********************
// ---- P/W General ----
// *********************

function refreshPWDate(item)
{
   var timeattr = item.getAttribute(attr.pulsedate);
   var message;

   if(!timeattr || timeattr === "0")
   {
      message = "";
   }
   else
   {
      message = Utilities.TimeDiff(timeattr);

      if(message.indexOf("now") < 0)
         message += " ago";
   }

   findSwap(item, "data-pwtime", message);
}

function refreshPWDates(parent) { [...parent.children].forEach(x => refreshPWDate(x)); }
function getPWUserlist(pulseitem) { return pulseitem.querySelector(".pw-users"); }

function makePWUser(user) //, message)
{
   var pu = cloneTemplate("pwuser");
   multiSwap(pu, {
      "data-pwuser": user.id,
      "data-pwuserlink": getUserLink(user.id)
   });
   UIkit.util.on(pu.querySelector("[uk-dropdown]"), 'beforeshow', 
      e => refreshPulseUserDisplay(e.target));
   return pu;
}

function makeOrAddPWContent(c, id, parent)
{
   var pulsedata = document.getElementById(id);

   if(!pulsedata)
   {
      pulsedata = cloneTemplate("pw");
      pulsedata.id = id;
      findSwap(pulsedata, "data-pwlink", getPageLink(c.id));
      parent.appendChild(finalizeTemplate(pulsedata));
   }

   //Update the content name now, might as well
   findSwap(pulsedata, "data-pwname", c.name);

   return pulsedata;
}

function makeOrAddPWUser(u, parent)
{
   var pulseuser = parent.querySelector('[data-pwuser="' + u.id + '"]');

   if(!pulseuser)
   {
      var pu = makePWUser(u);
      var pus = getPWUserlist(parent);

      //Go find the user element (hoping it exists)
      [...pu.children].forEach(x => 
      {
         if(x.hasAttribute("data-pwuser")) pulseuser = x;
         pus.appendChild(finalizeTemplate(x));
      });
   }

   var result = { user : pulseuser, dropdown : pulseuser.nextSibling };
   findSwap(result.user, "data-src", getImageLink(u.avatar, 40, true));
   findSwap(result.dropdown, "data-pwusername", u.username);

   return result;
}

// ***************
// ---- Pulse ----
// ***************

function pulseId(content) { return "pulseitem-" + content.id; }

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
      aggregate[c.id] = { pulse: makeOrAddPWContent(c, pulseId(c), pulse) };

   //Oops, never categorized this user IN this content
   if(!aggregate[c.id][u.id])
   {
      var pulseuser = makeOrAddPWUser(u, aggregate[c.id].pulse);

      aggregate[c.id][u.id] = getPulseUserData(pulseuser.dropdown);
      aggregate[c.id][u.id].user = pulseuser.dropdown;
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
         var pulseuserlist = getPWUserlist(aggregate[key].pulse);
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
      //Activity type is broken, needs to be fixed. This check is a temporary stopgap
      if(a.userId > 0 && a.type==="content") //need to check in case system
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

   refreshPWDates(pulse);
}


// ***************
// ---- Watch ----
// ***************

function watchId(content) { return "watchitem-" + content.id; }

function updateWatchGlobalAlert()
{
   var counts = watches.querySelectorAll("[" + attr.pulsecount + "]");
   var sum = 0;
   [...counts].forEach(x => sum += (Number(getSwap(x, attr.pulsecount)) || 0));
   watchglobalalert.textContent = sum ? String(sum) : "";
}

function displayNewWatches(data, fullReset)
{
   if(fullReset)
      watches.innerHTML = "";

   var users = idMap(data.user);
   var contents = idMap(data.content);
   var comments = idMap(data.commentaggregate);
   var activity = idMap(data.activityaggregate);

	for(var i = 0; i < data.watch.length; i++)
	{
		var c = contents[data.watch[i].contentId];
      var watchdata = makeOrAddPWContent(c, watchId(c), watches);

      var total = 0;
      var maxDate = watchdata.getAttribute(attr.pulsedate) || "0";

      var upd = function(t)
      {
         if(t)
         {
            for(var i = 0; i < t.userIds.length; i++)
               if(t.userIds[i] !== 0)
                  makeOrAddPWUser(users[t.userIds[i]], watchdata);

            total += t.count;
            if(t.lastDate > maxDate)
               maxDate = t.lastDate;
         }
      };

      upd(comments[c.id]);
      upd(activity[c.id]);

      if(total)
         findSwap(watchdata, attr.pulsecount, total);

      watchdata.setAttribute(attr.pulsedate, maxDate);
	}

   Utilities.SortElements(watches,
      x => x.getAttribute(attr.pulsedate) || "0", true);

   refreshPWDates(watches);
   updateWatchGlobalAlert();
   updateGlobalAlert();
}


// ***************
// ---- Route ----
// ***************

function routepage_load(url, pVal, id)
{
   setHasDiscussions(true);
   var params = new URLSearchParams();
   params.append("requests", "content-" + JSON.stringify({"ids" : [Number(id)]}));
   params.append("requests", "category");
   params.append("requests", "user.0createUserId.1edituserId");
   params.set("category", "id,name,parentId");

   //function quickApi(url, callback, error, postData, always, method)
   quickApi("read/chain?" + params.toString(), function(data)
   {
      console.datalog(data);
      var c = data.content[0];
      var users = idMap(data.user);
      multiSwap(maincontent, {
         "data-title" : c.name,
         "data-content" : c.content
      });
      makeBreadcrumbs(getChain(data.category, c));
      maincontentinfo.appendChild(makeStandardContentInfo(c, users));
      finalizePage();
   });
}

function routeuser_load(url, pVal, id)
{
   setHasDiscussions(true);
   var params = new URLSearchParams();
   params.append("requests", "user-" + JSON.stringify({"ids" : [Number(id)]}));
   params.append("requests", "content-" + JSON.stringify({
      "createUserIds" : [Number(id)],
      "type" : "@user.page",
      "limit" : 1
   }));

   //function quickApi(url, callback, error, postData, always, method)
   quickApi("read/chain?" + params.toString(), function(data)
   {
      console.datalog(data);
      var u = data.user[0];
      var c = data.content[0];
      u.name = u.username;
      multiSwap(maincontent, {
         "data-title" : u.username,
         "data-avatar" : getAvatarLink(u.avatar, 200),
         "data-content" : c ? c.content : ""
      });
      makeBreadcrumbs([u]);
      finalizePage();
   });
}
