var apiroot = "https://newdev.smilebasicsource.com/api";

var actiontext = {
   "c" : "Create",
   "r" : "Read",
   "u" : "Edit",
   "d" : "Delete"
};

var attr = {
   "pulsedate" : "data-maxdate",
   "pulsecount" : "data-pwcount",
   "pulsemaxid" : "data-pwmaxid",
   "constate" : "data-connectionindicator"
};

//Will this be stored in user eventually?
var options = {
   displaynotifications : { def : true, text : "Device Notifications" },
   watchclearnotif : {def: false, text : "Watch clear toast" },
   datalog : { def: false, text : "Log received data objects" },
   drawlog : { def: false, text : "Log custom render data" },
   loglongpollrequest : { def: false, text : "Log longpoller outgoing request" },
   imageresolution : { def: 1, text: "Image resolution scale", step : 0.05 },
   filedisplaylimit: { def: 40, text : "Image select files per page" },
   pagedisplaylimit: { def: 100, text: "Display pages per category" },
   initialloadcomments: { def: 30, text: "Initial comment pull" },
   discussionscrollspeed : { def: 0.25, text: "Scroll animation (1 = instant)", step: 0.01 },
   discussionscrolllock : { def: 0.15, text: "Page height % chat scroll lock", step: 0.01 },
   notificationtimeout : { def: 5, text: "Notification timeout (seconds)" },
   forcediscussionoutofdate : {def: false },
   retrievetechnicalinfo : {def:true },
   pulsepasthours : { def: 24 },
   discussionavatarsize : { def: 60 },
   showsidebarminrem : { def: 60 },
   refreshcycle : { def: 10000, },
   discussionscrollnow : {def: 1000 },
   longpollerrorrestart : {def: 5000 },
   defaultmarkup : {def:"12y"}
};

var globals = { 
   lastsystemid : 0,    //The last id retrieved from the system for actions
   reqId : 0,           //Ever increasing request id
};

console.datalog = (d,e,f) => { if(getLocalOption("datalog")) console.log(d,e,f); };
console.drawlog = (d,e,f) => { if(getLocalOption("drawlog")) console.log(d,e,f); };

window.Notification = window.Notification || {};

window.onerror = function(message, source, lineno, colno, error)
{
   notifyError(message + "\n(" + source + ":" + lineno + ")"); 
};

window.onload = function()
{
   log.Info("Window load event");

   var ww = Utilities.ConvertRem(Utilities.WindowWidth());
   log.Debug("Width REM: " + ww + ", pixelRatio: " + window.devicePixelRatio);

   if(ww >= getLocalOption("showsidebarminrem"))
      rightpanetoggle.click();

   setupSpa();

   setupDebugLog();
   setupTechnicalInfo();
   setupUserForms();
   setupFileUpload();
   setupAlerts();
   setupPageControls();
   setupDiscussions();
   setupLongpoller();

   setupSession();

   //Regardless if you're logged in or not, this will work "correctly" since
   //the spa processor will take your login state into account. And if you're
   //not "REALLY" logged in, well whatever, better than processing it twice.
   globals.spa.ProcessLink(document.location.href);
   refreshCycle(true);
};

function refreshCycle(dryRun)
{
   if(!dryRun)
   {
      refreshPWDates(pulse);
      refreshPWDates(watches);
   }

   globals.refreshCycle = setTimeout(refreshCycle, getLocalOption("refreshcycle"));
}

function safety(func)
{
   try { func(); }
   catch(ex)
   {
      notifyError("Failed: " + ex.message);
      console.log(ex);
   }
}

// ********************
// ---- SETUP CODE ----
// ********************

function setupSpa()
{
   globals.spa = new BasicSpa(log);

   //For now, we have ONE processor!
   globals.spa.Processors.push(new SpaProcessor(url => 
   {
      if(globals.spa.processingurl)
      {
         log.Warn("Spa busy processing '" + globals.spa.processingurl +
            "', ignoring new request '" + url + "'");
         return false;
      }
      return true;
   }, url =>
   {
      globals.spa.processingurl = url;

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

   globals.spa.SetHandlePopState();
   log.Debug("Setup SPA, override handling popstate");
}

function setupDebugLog()
{
   UIkit.util.on('#logsparent', 'show', () =>
   {
      //Find the last id, only display new ones.
      log.Debug("Debug log shown, rendering new messages");
      var lastId = (logs.lastElementChild ?  Number(logs.lastElementChild.dataset.id) : 0);
      var msgBase = cloneTemplate("log");
      for(var i = 0; i < log.messages.length; i++)
      {
         if(log.messages[i].id > lastId)
         {
            var logMessage = msgBase.cloneNode(true);
            logMessage.setAttribute("data-id", log.messages[i].id);
            multiSwap(logMessage, {
               "data-message": log.messages[i].message,
               "data-level": log.messages[i].level,
               "data-time": log.messages[i].time
            });
            logs.appendChild(logMessage);
         }
      }
   });
   log.Debug("Setup logger display");
}

function setupTechnicalInfo()
{
   if(getLocalOption("retrievetechnicalinfo"))
   {
      quickApi("test/info", (data) =>
      {
         log.Debug("Received technical info from API");

         multiSwap(technicalinfo, {
            "data-apiroot": apiroot,
            "data-apiversion": data.versions.contentapi,
            "data-entitysystemversion": data.versions.entitysystem
         });
      });
   }
}

function setupPageControls()
{
   var makeSet = f => function(event) { event.preventDefault(); f(); };

   fulldiscussionmode.onclick = makeSet(setFullDiscussionMode);
   fullcontentmode.onclick = makeSet(setFullContentMode);
   splitmodecontent.onclick = makeSet(setSplitMode);
   splitmodediscussion.onclick = makeSet(setSplitMode);

   log.Debug("Setup page controls");
}

function setupUserForms()
{
   formSetupSubmit(loginform, "user/authenticate", token => login(token));
   userlogout.addEventListener("click", () => logout());
   formSetupSubmit(passwordresetform, "user/passwordreset/sendemail", result =>
   {
      log.Info("Password reset code sent!");
      passwordresetstep2.click();
   });
   formSetupSubmit(passwordresetconfirmform, "user/passwordreset", token =>
   {
      notifySuccess("Password reset!");
      login(token);
   }, formData =>
   {
      if(formData.password != formData.password2)
         return "Passwords don't match!"
      return undefined;
   });
   formSetupSubmit(registerform, "user/register", token =>
   {
      log.Info("Registration submitted! Sending email...");
      quickApi("user/register/sendemail", 
         () => log.Info("Registration email sent! Check your email"), 
         req => notifyError("There was a problem sending your email. However, your registration was submitted successfully."), 
         {"email" : formSerialize(registerform)["email"] });
      registrationstep2.click();
   }, formData =>
   {
      if(formData.password != formData.password2)
         return "Passwords don't match!"
      return undefined;
   });
   formSetupSubmit(registerconfirmform, "user/register/confirm", token =>
   {
      notifySuccess("Registration complete!");
      login(token);
   });

   userchangeavatar.addEventListener("click", function() {
      globals.fileselectcallback = function(id) {
         quickApi("user/basic", () => refreshUserFull(), undefined, 
            { "avatar" : id }, undefined, "PUT"); 
      };
   });

   allowNotifications.onclick = () => Notification.requestPermission();

   refreshlocaloptions.onclick = event => {
      event.preventDefault();
      refreshOptions();
   };

   refreshOptions();

   log.Debug("Setup all user forms");
}

function refreshOptions()
{
   log.Info("Refreshing user options");
   userlocaloptions.innerHTML = "";
   developerlocaloptions.innerHTML = "";

   var lastType = false;

   if(Notification.permission === "granted")
      hide(allowNotifications);

   //Set up options
   for(key in options)
   {
      var o = options[key];
      var text = o.text;
      var prnt = userlocaloptions;
      var templn = o.type;
      let vconv = x => x;

      if(!text) //oops, this is a developer option
      {
         text = key;
         prnt = developerlocaloptions;
      }

      if(!templn)
      {
         var to = typeof o.def;
         if(to === "boolean") 
         {
            templn = "bool";
         }
         else if(to === "number") 
         {
            templn = "number";
            vconv = x => Number(x);
         }
         else 
         {
            templn = "raw";
         }
      }

      let elm = cloneTemplate(templn + "option");
      let k = key;
      multiSwap(elm, {
         "data-text" : o.text || key,
         "data-input" : getLocalOption(key)
      });
      elm.onchange = e => { 
         var val = vconv(getSwap(elm, "data-input"));
         log.Info("Setting " + k + " to " + val);
         setLocalOption(k, val);
      };
      finalizeTemplate(elm);

      if(lastType && lastType !== templn)
         elm.className += " uk-margin-small-top";
      if(o.step)
         findSwap(elm, "data-step", o.step);

      lastType = templn;
      prnt.appendChild(elm);
   }
}

function getLocalOption(key)
{
   var val = localStorage.getItem("localsetting_" + key);
   if(val === null || val === undefined)
      return options[key].def;
   else
      return JSON.parse(val);
}

function setLocalOption(key, value)
{
   localStorage.setItem("localsetting_" + key, JSON.stringify(value));
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
            logout();
         }, undefined, "pleaseinvalidate");
      }, () => log.Debug("Cancelled invalidate tokens"));
   });

   log.Debug("Setup alerts");
}

function setupFileUpload()
{
   UIkit.util.on('#fileupload', 'beforeshow', function () {
      log.Debug("File upload shown, refreshing images");
      setFileUploadList(0, fileuploadsearchall.checked);
   });

   fileuploadsearchall.addEventListener("change", 
      () => setFileUploadList(0, fileuploadsearchall.checked));

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
      if(globals.fileselectcallback)
      {
         //for safety, remove callback
         globals.fileselectcallback(getSwap(selectedImage, "data-fileid")); 
         globals.fileselectcallback = false;
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

   log.Debug("Setup all file uploading/handling");
}

//Right now, this can only be called once :/
function setupDiscussions()
{
   globals.discussion =
   { 
      "lastanimtime" : 0,
      "observer" : new ResizeObserver(entries => 
      {
         if((globals.discussion.rect && globals.discussion.scrollHeight &&
             scrollDiscussionsDistance(globals.discussion.scrollHeight) < 
             globals.discussion.rect.height * getLocalOption("discussionscrolllock")) ||
             performance.now() < globals.discussion.scrollNow)
         {
            setDiscussionScrollNow();
         }

         globals.discussion.scrollHeight = discussions.scrollHeight;

         for (let entry of entries) 
         {
            if(entry.target.id === "discussions")
               globals.discussion.rect = entry.contentRect;
         } 
      })
   };

   postdiscussiontext.onkeypress = function(e) 
   {
		if (!e.shiftKey && e.keyCode == 13) 
      {
			e.preventDefault();

         var currentDiscussion = getActiveDiscussion();
         let currentText = postdiscussiontext.value;

         quickApi("comment", data => { }, error =>
         {
            notifyError("Couldn't post comment! " + error.status + ": " + error.statusText);
            postdiscussiontext.value = currentText;
         }, {
            "parentId" : Number(currentDiscussion),
            "content" : createComment(postdiscussiontext.value, getLocalOption("defaultmarkup"))
         });

         postdiscussiontext.value = "";
         setDiscussionScrollNow(getLocalOption("discussionscrollnow"));
		}
	};

   discussionimageselect.addEventListener("click", function() {
      globals.fileselectcallback = function(id) {
         //TODO: this assumes 12y format
         postdiscussiontext.value += " !" + getImageLink(id);
      };
   });


   //Begin the animation loop for discussion scrolling
   scrollDiscussionsAnimation(0);

   log.Debug("Setup discussions (scrolling/etc)");
}

function setupLongpoller()
{
   globals.longpoller = {};
   log.Debug("Setup long poller (not started)");
}

//Set up the page and perform initial requests for being "logged in"
function setupSession()
{
   //Don't do this special crap until everything is setup, SOME setup may not
   //be required before the user session is started, but it's minimal savings.
   if(getToken())
      log.Info("User token found, trying to continue logged in");
   else
      return;

   rightpane.style.opacity = 0.2;
   //Refreshing will set our login state, don't worry about that stuff.
   refreshUserFull(() => rightpane.style.opacity = 1.0);

   var params = new URLSearchParams();
   var search = {"reverse":true,"createstart":Utilities.SubHours(getLocalOption("pulsepasthours")).toISOString()};
   var watchsearch = {"ContentLimit":{"Watches":true}};
   params.append("requests", "systemaggregate");
   params.append("requests", "comment-" + JSON.stringify(search));
   //search.type ="content"; //Add more restrictions for activity
   params.append("requests", "activity-" + JSON.stringify(search));
   params.append("requests", "watch");
   params.append("requests", "commentaggregate-" + JSON.stringify(watchsearch));
   params.append("requests", "activityaggregate-" + JSON.stringify(watchsearch));
   params.append("requests", "content.2contentId.1parentId.3contentId");
   params.append("requests", "user.2userId.1createUserId.4userIds.5userIds");
   params.set("comment","id,parentId,createUserId,createDate");
   params.set("content","id,name");
   params.set("user","id,username,avatar");
   params.set("watch","id,contentId,lastNotificationId");

   quickApi("read/chain?" + params.toString(), function(data)
   {
      console.datalog(data);

      data.systemaggregate.forEach(x => 
      {
         if(x.type === "actionMax")
         {
            log.Info("Last system id: " + x.id);
            globals.lastsystemid = x.id;

            if(getLocalOption("forcediscussionoutofdate"))
               globals.lastsystemid -= 2000;
         }
      });

      //Fully stock (with reset) the sidepanel
      updatePulse(data, true);
      updateWatches(data, true);
   });
}

function login(token) { setToken(token); location.reload(); }
function logout() { setToken(null); location.reload(); }


// **********************
// ---- Page Modify ----
// **********************

//This is the VISIBILITY modifier, it's just how the page LOOKS. So you can
//call this whenever, it won't do anything major.
function setLoginState(loggedIn)
{
   //check current login state. User is logged in if first element (the user
   //login section) is hidden.
   var currentState = rightpanenav.firstElementChild.hasAttribute("hidden");

   //Force an inverted state if the state isn't the same. Definitely room for
   //timing errors here but egh whatever, sorry users (for now).
   if(currentState != loggedIn)
   {
      log.Info("Set login visual state to: " + loggedIn);
      toggleuserstate.click();
   }
}

function updateUserData(user)
{
   //Just username and avatar for now?
   navuseravatar.src = getAvatarLink(user.avatar, 40);
   userusername.firstElementChild.textContent = user.username;
   userusername.href = getUserLink(user.id);
   userid.textContent = "User ID: " + user.id;
   userid.setAttribute("data-userid", user.id);  //Can't use findSwap: it's an UPDATE
   finalizeTemplate(userusername); //be careful with this!
   //Check fields in user for certain special fields like email etc.
}

function refreshUserFull(always)
{
   //Make an API call to /me to get the latest data.
   quickApi("user/me", function(user)
   {
      updateUserData(user);
      //Don't set up the FULL session, you know? Someone else will do that
      setLoginState(true); 
   }, function(req)
   {
      //Assume any failed user refresh means they're logged out
      log.Error("Couldn't refresh user, deleting cached token");
      logout();
   }, undefined, always);
}

function setFileUploadList(page, allImages)
{
   fileuploaditems.innerHTML = "<div uk-spinner='ratio: 3'></div>";
   fileuploadthumbnails.innerHTML = "";

   var fdl = getLocalOption("filedisplaylimit");
   var url = "file?reverse=true&limit=" + fdl + "&skip=" + (fdl * page);
      
   if(!allImages)
      url += "&createuserids=" + getUserId();

   quickApi(url, files =>
   {
      fileuploaditems.innerHTML = "";
      for(var i = 0; i < files.length; i++)
      {
         addFileUploadImage(files[i], i);
      }

      fileuploadnewer.onclick = e => { e.preventDefault(); setFileUploadList(page - 1, allImages); }
      fileuploadolder.onclick = e => { e.preventDefault(); setFileUploadList(page + 1, allImages); }

      setHidden(fileuploadnewer, page <= 0);
      setHidden(fileuploadolder, files.length !== fdl);
   });
}

function addFileUploadImage(file, num)
{
   var fItem = cloneTemplate("fupmain");
   var fThumb = cloneTemplate("fupthumb");
   multiSwap(fItem, { 
      "data-imgsrc": getImageLink(file.id) 
   });
   multiSwap(fThumb, {
      "data-imgsrc": getImageLink(file.id, 60, true),
      "data-number": num,
      "data-fileid": file.id
   });
   fileuploaditems.appendChild(fItem);
   fileuploadthumbnails.appendChild(fThumb);
}

function updateGlobalAlert()
{
   setHidden(globalalert, !watchglobalalert.textContent);
}

function initializePage()
{
   log.Debug("Initializing page to a clean slate");

   //Clear out the breadcrumbs
   breadcrumbs.innerHTML = "";

   //Clear out anything that used to be there
   maincontent.innerHTML = "";
   maincontentinfo.innerHTML = "";
   discussionuserlist.innerHTML = "";
   easyShowDiscussion(false);
   globals.discussion.current = 0;

   //show the loading bar
   unhide(maincontentloading);
}

//Finish rendering a page. For "ease", can also include information about the
//available discussion so we can do a few things.
function finalizePage(chain, discussion)
{
   hide(maincontentloading);
   globals.spa.processingurl = false;

   if(chain)
      makeBreadcrumbs(chain);

   if(discussion)
   {
      maincontentinfo.appendChild(
         makeStandardContentInfo(discussion.content, discussion.users));
      easyComments(discussion.comments, discussion.users);
      setDiscussionScrollNow(getLocalOption("discussionscrollnow"));
   }

   finalizeTemplate(maincontent);

   //At the end of it, update the long poller (no matter if there's a
   //discussion or not, because maybe we need to EXIT the last room)
   updateLongPoller();

   log.Debug("Page render finalized");
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

function updateDiscussionUserlist(listeners, users)
{
   var list = listeners ? listeners[getActiveDiscussion()] : false;
   list = list || {};

   for(key in list)
   {
      let uid = key;
      var existing = discussionuserlist.querySelector('[data-uid="' + uid + '"]');
      var avatar = getAvatarLink(users[uid].avatar, 40);

      if(!existing)
      {
         existing = cloneTemplate("discussionuser");
         multiSwap(existing, {
            "data-avatar" : avatar,
            "data-userlink" : getUserLink(uid)
         });
         finalizeTemplate(existing);
         discussionuserlist.appendChild(existing);
      }

      existing.setAttribute("data-uid", uid);
      existing.setAttribute("data-status", list[uid]);
      findSwap(existing, "data-avatar", avatar);
   }

   [...discussionuserlist.querySelectorAll("[data-uid]")].forEach(x => 
   {
      if(!list[x.getAttribute("data-uid")])
         Utilities.RemoveElement(x);
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
   if(token)
      token = JSON.stringify(token);
   window.localStorage.setItem("usertoken", token);
}

function getUserId() { return userid.dataset.userid; }

function hide(e) { e.setAttribute("hidden", ""); }
function unhide(e) { e.removeAttribute("hidden"); }
function setHidden(e, hidden) { if(hidden) hide(e); else unhide(e); }

function getUserLink(id) { return "?p=user-" + id; }
function getPageLink(id) { return "?p=page-" + id; }
function getCategoryLink(id) { return "?p=category-" + id; }

function getImageLink(id, size, crop, ignoreRatio)
{
   var img = apiroot + "/file/raw/" + id;
   var linkch = "?";
   if(size) 
   { 
      img += linkch + "size=" + Math.max(10, 
         Math.floor(size * getLocalOption("imageresolution") * 
            (ignoreRatio ? 1 : window.devicePixelRatio))); 
      linkch = "&"; 
   }
   if(crop) { img += linkch + "crop=true"; linkch = "&"; }
   return img;
}

function getAvatarLink(id, size, ignoreRatio) { return getImageLink(id, size, true, ignoreRatio); }

function idMap(data)
{
   data = data || [];
   var ds = {};
   for(var i = 0; i < data.length; i++)
      ds[data[i].id] = data[i];
   return ds;
}

function sortById(a)
{
   return a.sort((x,y) => Math.sign(x.id - y.id));
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
         icon + "; ratio: 1.4' class='uk-flex-none uk-text-" + status + 
         "'></span><span class=" +
         "'uk-width-expand uk-text-break notification-actual'>" + 
         message + "</span></span>", 
      "pos":"bottom-right",
      "timeout": Math.floor(getLocalOption("notificationtimeout") * 1000)
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

function commentsToAggregate(comment)
{
   var comments = {};

   if(comment)
   {
      comment.forEach(c =>
      {
         if(!comments[c.parentId]) 
            comments[c.parentId] = { "lastDate" : "0", "count" : 0, "userIds" : [], "id" : c.parentId};
         var cm = comments[c.parentId];
         if(cm.userIds.indexOf(c.createUserId) < 0) cm.userIds.push(c.createUserId);
         if(c.createDate > cm.lastDate) cm.lastDate = c.createDate;
         cm.count++;
      });
   }

   return Object.values(comments);
}

function activityToAggregate(activitee)
{
   var activity = {};

   if(activitee)
   {
      activitee.forEach(a =>
      {
         if(!activity[a.contentId]) 
            activity[a.contentId] = { "lastDate" : "0", "count" : 0, "userIds" : [], "id" : a.contentId};
         var ac = activity[a.contentId];
         if(ac.userIds.indexOf(a.userId) < 0) ac.userIds.push(a.userId);
         if(a.date > ac.lastDate) ac.lastDate = a.date;
         ac.count++;
      });
   }

   return Object.values(activity);
}

function setupWatchLink(parent, cid)
{
   var watchLink = parent.querySelector("[data-watched]");
   watchLink.onclick = function(event)
   {
      event.preventDefault();
      var watched = getSwap(watchLink, "data-watched");
      var failure = function(req)
      {
         findSwap(watchLink, "data-watched", watched); //the original;
         notifyError("Watch failed: " + req.status + " - " + req.statusText);
      };
      if(watched === "true")
      {
         findSwap(watchLink, "data-watched", "false");
         quickApi("watch/" + cid + "/delete", data =>
         {
            log.Info("Remove watch " + cid + " successful!");
         }, failure, {});
      }
      else
      {
         findSwap(watchLink, "data-watched", "true");
         quickApi("watch/" + cid, data =>
         {
            log.Info("Watch " + cid + " successful!");
         }, failure, {});
      }
   };
}

function setupWatchClear(parent, cid)
{
   let watchLink = parent.querySelector("[data-clearcount]");
   let watchAlert = parent.querySelector("[data-pwcount]");

   watchLink.onclick = function(event)
   {
      event.preventDefault();

      watchAlert.className = watchAlert.className.replace(/danger/g, "warning");
      console.log(watchAlert);

      if(getLocalOption("watchclearnotif"))
         notifyBase("Clearing notifications for '" + getSwap(parent, "data-pwname") + "'");

      quickApi("watch/" + cid + "/clear", data =>
      {
         log.Info("Clear watch " + cid + " successful!");
      }, req =>
      {
         notifyError("Failed to clear watches for cid " + cid);
      }, {} /* Post data */ , () => //Always
      {
         watchAlert.className = watchAlert.className.replace(/warning/g, "danger");
      });
   };
}

// ***********************
// ---- TEMPLATE CRAP ----
// ***********************

function cloneTemplate(name)
{
   var elm = document.querySelector("#templates > [data-" + name + "]");
   if(!elm)
      throw "No template found: " + name;
   return elm.cloneNode(true);
}

function finalizeTemplate(elm)
{
   var links = elm.querySelectorAll("[data-spa]");
   [...links].forEach(x =>
   {
      x.onclick = globals.spa.ClickFunction(x.href);
   });
   if(elm.hasAttribute("data-spa"))
      elm.onclick = globals.spa.ClickFunction(elm.href);
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

function makePWUser(user)
{
   var pu = cloneTemplate("pwuser");
   pu.setAttribute("data-pwuser", user.id);
   multiSwap(pu, {
      "data-userlink": getUserLink(user.id)
   });
   UIkit.util.on(pu.querySelector("[uk-dropdown]"), 'beforeshow', 
      e => refreshPulseUserDisplay(e.target));
   finalizeTemplate(pu);
   return pu;
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

function makeCommentFrame(comment, users)
{
   var frame = cloneTemplate("messageframe");
   var u = users[comment.createUserId];
   multiSwap(frame, {
      "data-userid": comment.createUserId,
      "data-userlink": getUserLink(comment.createUserId),
      "data-useravatar": getAvatarLink(u.avatar, getLocalOption("discussionavatarsize")),
      "data-username": u.username,
      "data-frametime": (new Date(comment.createDate)).toLocaleString()
   });
   finalizeTemplate(frame);
   return frame;
}

function makeCommentFragment(comment)//, users)
{
   var fragment = cloneTemplate("singlemessage");
   multiSwap(fragment, {
      "data-messageid": comment.id,
      "data-id": getCommentId(comment.id),
      "data-createdate": (new Date(comment.createDate)).toLocaleString(),
      "data-editdate": (new Date(comment.editDate)).toLocaleString()
   });
   finalizeTemplate(fragment);
   return fragment;
}


function getSwapElement(element, attribute)
{
   if(element.hasAttribute(attribute))
      return element;

	return element.querySelector("[" + attribute + "]");
}

//How does this work?
//-Find an element by (assumed unique) attribute
//-If attribute is empty, that is AN ERROR
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
         throw "Bad attribute " + attribute + " (empty)";

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
      log.Error("Can't swap attribute " + attribute + " on element " + element + " : " + ex);
   }
}

function findSwap(element, attribute, replace) { swapBase(element, attribute, replace); }
function getSwap(element, attribute) { return swapBase(element, attribute); }

function multiSwap(element, replacements)
{
   for(key in replacements)
      findSwap(element, key, replacements[key]);
}

function getChain(categories, content)
{
   //work backwards until there's no parent id
   var crumbs = [ content ];
   var cs = idMap(categories);

   while(crumbs[0].parentId)
      crumbs.unshift(cs[crumbs[0].parentId]);

   if(!crumbs.some(x => x.id === 0))
      crumbs = [{"name":"Root","id":0}].concat(crumbs);

   return crumbs;
}


// *************
// ---- API ----
// *************

function quickApi(url, callback, error, postData, always, method, modify, nolog)
{
   let thisreqid = ++globals.reqId;
   var endpoint = url; var epquery = url.indexOf("?");
   if(epquery >= 0) endpoint = endpoint.substr(0, epquery);

   url = apiroot + "/" + url;
   error = error || (e => notifyError("Error on " + url + ":\n" + e.status + " - " + e.responseText));

   method = method || (postData ? "POST" : "GET");

   if(!nolog)
      log.Info("[" + thisreqid + "] " + method + ": " + url);

   var req = new XMLHttpRequest();
   //This is supposedly thrown before the others
   req.addEventListener("error", function() { req.networkError = true; });
   req.addEventListener("loadend", function()
   {
      log.Debug("[" + thisreqid + "]: " + req.status + " " + req.statusText + 
         " (" + req.response.length + "b) " + endpoint);
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
         //Also thrown on network error
         error(req);
      }
   });

   req.open(method, url);
   req.setRequestHeader("accept", "application/json");
   req.setRequestHeader("Content-Type", "application/json");

   var token = getToken(); //Do this as late as possible "just in case" (it makes no difference though)
   if(token)
      req.setRequestHeader("Authorization", "Bearer " + token);

   if(modify)
      modify(req);

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

function easyPWContent(c, id, parent)
{
   var pulsedata = document.getElementById(id);

   if(!pulsedata)
   {
      pulsedata = cloneTemplate("pw");
      pulsedata.id = id;
      multiSwap(pulsedata, {
         "data-pwlink": getPageLink(c.id),
         "data-contentid" : c.id
      });
      parent.appendChild(finalizeTemplate(pulsedata));
   }

   //Update the content name now, might as well
   findSwap(pulsedata, "data-pwname", c.name);

   return pulsedata;
}

function easyPWUser(u, parent)
{
   var pulseuser = parent.querySelector('[data-pwuser="' + u.id + '"]');

   if(!pulseuser)
   {
      pulseuser = makePWUser(u);
      getPWUserlist(parent).appendChild(pulseuser);
   }

   multiSwap(pulseuser, {
      "data-useravatar": getImageLink(u.avatar, 40, true),
      "data-username": u.username
   });

   return pulseuser;
}

// ***************
// ---- Pulse ----
// ***************

function pulseId(cid) { return "pulseitem-" + cid; }

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
      aggregate[c.id] = { pulse: easyPWContent(c, pulseId(c.id), pulse) };

   //Oops, never categorized this user IN this content
   if(!aggregate[c.id][u.id])
   {
      var pulseuser = easyPWUser(u, aggregate[c.id].pulse);

      aggregate[c.id][u.id] = getPulseUserData(pulseuser);
      aggregate[c.id][u.id].user = pulseuser;
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

   if(data.comment)
   {
      for(var i = 0; i < data.comment.length; i++)
      {
         var c = data.comment[i];
         if(c.createUserId) //need to check in case deleted comment
         {
            var d = cataloguePulse(contents[c.parentId], users[c.createUserId], aggregate);
            updatePulseCatalogue(d.comment, c.createDate);
         }
      }
   }

   if(data.activity)
   {
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
   }

   applyPulseCatalogue(aggregate);

   Utilities.SortElements(pulse,
      x => x.getAttribute(attr.pulsedate) || "0", true);

   refreshPWDates(pulse);
}


// ***************
// ---- Watch ----
// ***************

function watchId(cid) { return "watchitem-" + cid; }

function getWatchLastIds()
{
   var result = {};
   [...watches.querySelectorAll("[data-pw]")].forEach(x =>
   {
      result[Number(getSwap(x, "data-contentid"))] =
         Number(x.getAttribute(attr.pulsemaxid));
   });
   return result;
}

function updateWatchGlobalAlert()
{
   var counts = watches.querySelectorAll("[" + attr.pulsecount + "]");
   var sum = 0;
   [...counts].forEach(x => sum += (Number(getSwap(x, attr.pulsecount)) || 0));
   watchglobalalert.textContent = sum ? String(sum) : "";
}

function updateWatchSingletons(data)
{
   updateWatchComAct(idMap(data.user), 
      idMap(commentsToAggregate(data.comment)), 
      idMap(activityToAggregate(data.activity)));
}

function updateWatchComAct(users, comments, activity)
{
   [...new Set(Object.keys(comments).concat(Object.keys(activity)))].forEach(cid =>
   {
      var watchdata = document.getElementById(watchId(cid)); 

      if(watchdata)
      {
         var total = Number(getSwap(watchdata, attr.pulsecount) || "0");
         var maxDate = watchdata.getAttribute(attr.pulsedate) || "0";

         var upd = function(t)
         {
            if(t)
            {
               for(var i = 0; i < t.userIds.length; i++)
                  if(t.userIds[i] !== 0)
                     easyPWUser(users[t.userIds[i]], watchdata);

               total += t.count;

               if(t.lastDate > maxDate)
                  maxDate = t.lastDate;
            }
         };

         upd(comments[cid]);
         upd(activity[cid]);

         if(total)
            findSwap(watchdata, attr.pulsecount, total);

         watchdata.setAttribute(attr.pulsedate, maxDate);
      }
   });

   Utilities.SortElements(watches,
      x => x.getAttribute(attr.pulsedate) || "0", true);

   refreshPWDates(watches);
   updateWatchGlobalAlert();
   updateGlobalAlert();
}

function updateWatches(data, fullReset)
{
   if(fullReset)
      watches.innerHTML = "";

   var users = idMap(data.user);
   var contents = idMap(data.content);
   var comments = idMap(data.commentaggregate);
   var activity = idMap(data.activityaggregate);

   if(data.watch)
   {
      for(var i = 0; i < data.watch.length; i++)
      {
         var c = contents[data.watch[i].contentId];
         var watchdata = easyPWContent(c, watchId(c.id), watches);
         setupWatchClear(watchdata, c.id);
         watchdata.setAttribute(attr.pulsemaxid, data.watch[i].lastNotificationId);
      }
   }

   if(data.watchdelete)
   {
      for(var i = 0; i < data.watchdelete.length; i++)
      {
         var w = document.getElementById(watchId(data.watchdelete[i].contentId));
         if(w) Utilities.RemoveElement(w);
      }
   }

   //Note that because this happens before adding, if a clear comes WITH
   //comments, the comments will be added on top of the clear. That's probably
   //fine, but may not reflect reality. It's hard to say, depends on the API
   if(data.watchupdate) //ALL of these are assumed to be clears right now!!
   {
      for(var i = 0; i < data.watchupdate.length; i++)
      {
         var w = document.getElementById(watchId(data.watchupdate[i].contentId));

         if(w) 
         {
            getPWUserlist(w).innerHTML = "";
            findSwap(w, attr.pulsecount, "");
            w.setAttribute(attr.pulsedate, "0");
         }
      }
   }

   updateWatchComAct(users, comments, activity);
}


// ***************
// ---- Route ----
// ***************

function routepage_load(url, pVal, id)
{
   easyShowDiscussion(id);
   var pid = Number(id);
   var params = new URLSearchParams();
   params.append("requests", "content-" + JSON.stringify({"ids" : [pid], "includeAbout" : true}));
   params.append("requests", "category");
   params.append("requests", "comment-" + JSON.stringify({
      "Reverse" : true,
      "Limit" : getLocalOption("initialloadcomments"),
      "ParentIds" : [ pid ]
   }));
   params.append("requests", "user.0createUserId.0edituserId.2createUserId");
   params.set("category", "id,name,parentId");

   quickApi("read/chain?" + params.toString(), function(data)
   {
      console.datalog(data);
      var c = data.content[0];
      var users = idMap(data.user);
      multiSwap(maincontent, {
         "data-title" : c.name,
         "data-content" : JSON.stringify({ "content" : c.content, "format" : c.values.markupLang }),
         "data-format" : c.values.markupLang,
         "data-watched" : c.about.watching
      });
      setupWatchLink(maincontent, c.id);
      finalizePage(getChain(data.category, c), 
         { "users" : users, "comments" : data.comment, "content" : c });
   });
}

//This is EXTREMELY similar to pages, think about doing something different to
//minimize duplicate code???
function routeuser_load(url, pVal, id)
{
   var uid = Number(id);
   var params = new URLSearchParams();
   params.append("requests", "user-" + JSON.stringify({"ids" : [Number(id)]}));
   params.append("requests", "content-" + JSON.stringify({
      "createUserIds" : [Number(id)],
      "type" : "@user.page",
      "limit" : 1
   }));
   params.append("requests", "comment.1id$ParentIds-" + JSON.stringify({
      "Reverse" : true,
      "Limit" : getLocalOption("initialloadcomments")
   }));
   params.append("requests", "user.1createUserId.1edituserId.2createUserId");

   quickApi("read/chain?" + params.toString(), function(data)
   {
      console.datalog(data);
      var users = idMap(data.user);
      var u = users[uid];
      var c = data.content[0];
      u.name = u.username;
      multiSwap(maincontent, {
         "data-title" : u.username,
         "data-avatar" : getAvatarLink(u.avatar, 100),
         "data-content" : c ? JSON.stringify({ "content" : c.content, "format" : c.values.markupLang }) : false
      });
      var discussion = false;
      if(c)
      {
         easyShowDiscussion(c.id);
         discussion = { "users" : users, "content" : c, "comments" : data.comment };
      }
      else
      {
         maincontentinfo.innerHTML = "No user page";
      }

      finalizePage([u], discussion);
   });
}

function routecategory_load(url, pVal, id)
{
   var cid = Number(id);
   var params = new URLSearchParams();
   params.append("requests", "content-" + JSON.stringify({
      "parentIds" : [cid], 
      "sort" : "editDate",
      "reverse" : true,
      "limit": getLocalOption("pagedisplaylimit")
   }));
   params.append("requests", "category");
   params.append("requests", "user.0createUserId.0edituserId.1createUserId");
   params.set("content", "id,name,parentId,createDate,editDate,createUserId");

   quickApi("read/chain?" + params.toString(), function(data)
   {
      console.datalog(data);
      var users = idMap(data.user);
      var categories = idMap(data.category);
      var c = categories[cid] || { "name" : "Website Root" , "id" : 0 };
      multiSwap(maincontent, {
         "data-title" : c.name
      });
      var sbelm = maincontent.querySelector("[data-subcats]");
      var pgelm = maincontent.querySelector("[data-pages]");
      data.category.filter(x => x.parentId === cid).forEach(x =>
      {
         var subcat = cloneTemplate("subcat");
         multiSwap(subcat, {
            "data-link": getCategoryLink(x.id),
            "data-name": x.name
         });
         finalizeTemplate(subcat);
         sbelm.appendChild(subcat);
      });
      data.content.forEach(x =>
      {
         var date = (new Date(x.createDate)).toLocaleDateString();
         //if(x.editDate != x.createDate)
         //   date = "(" + (new Date(x.editDate)).toLocaleDateString() + ")\n" + date;
         var citem = cloneTemplate("pageitem");
         var u = users[x.createUserId] || {};
         multiSwap(citem, {
            "data-link": getPageLink(x.id),
            "data-name": x.name,
            "data-avatar" : getAvatarLink(u.avatar, 50, true),
            "data-userlink" : getUserLink(x.createUserId),
            "data-time" : date
         });
         finalizeTemplate(citem);
         pgelm.appendChild(citem);
      });
      finalizePage(getChain(data.category, c));
   });
}

function renderContent(elm, repl)
{
   if(repl)
   {
      elm.setAttribute("data-rawcontent", repl);
      elm.innerHTML = "";
      var content = JSON.parse(repl);
      elm.appendChild(Parse.parseLang(content.content, content.format));
   }

   return elm.getAttribute("data-rawcontent");
}

// ********************
// ---- Discussion ----
// ********************

function scrollDiscussionsDistance(baseHeight)
{
   var baseHeight = baseHeight || discussions.scrollHeight;
   return globals.discussion.rect ? baseHeight - 
      (globals.discussion.rect.height + discussions.scrollTop) : 0;
}

function scrollDiscussionsAnimation(timestamp)
{
   if(Math.abs(discussions.scrollTop - globals.discussion.scrollTop) <= 1)
   {
      //We will go at MINIMUM half framerate (to prevent huge stops from
      //destroying the animation)
      var delta = Math.min(32, timestamp - globals.discussion.lastanimtime);
      var scd = scrollDiscussionsDistance();
      var scm = Math.max(1, delta * 60 / 1000 * 
         getLocalOption("discussionscrollspeed") * Math.abs(scd));
      console.drawlog("scd: " + scd + ", scm: " + scm + ", delta: " 
         + delta + ", dst: " + discussions.scrollTop);
      //These are added separately because eventually, our scrolltop will move
      //past the actual assigned one
      globals.discussion.scrollTop = Math.ceil(globals.discussion.scrollTop + scm);
      discussions.scrollTop = globals.discussion.scrollTop;
      console.drawlog("New dst: " + discussions.scrollTop + ", gst: " +
         globals.discussion.scrollTop);
   }

   globals.discussion.lastanimtime = timestamp;
   window.requestAnimationFrame(scrollDiscussionsAnimation);
}

//function 

//Set the discussion to scroll, and if forceTime is set, CONTINUE scrolling
//even if the scroller shouldn't be (like the user is too far up)
function setDiscussionScrollNow(forceTime)
{
   globals.discussion.scrollTop = discussions.scrollTop;

   if(forceTime)
      globals.discussion.scrollNow = performance.now() + forceTime; 
}

function createComment(rawtext, markup) {
   return JSON.stringify({"m":markup}) + "\n" + rawtext;
}

function parseComment(content) {
   var newline = content.indexOf("\n");
   try {
      // try to parse the first line as JSON
      var data = JSON.parse(newline>=0 ? content.substr(0, newline) : content);
   } finally {
      if (data && data.constructor == Object) { // new or legacy format
         if (newline >= 0)
            data.t = content.substr(newline+1); // new format
      } else // raw
         data = {t: content};
      return data;
   }
}

function renderComment(elm, repl)
{
   if(repl)
   {
      elm.setAttribute("data-rawmessage", repl);
      var comment = parseComment(repl);
      elm.innerHTML = "";
      elm.appendChild(Parse.parseLang(comment.t, comment.m));
   }

   return elm.getAttribute("data-rawmessage");
}

function getDiscussionId(id) { return "discussion-" + id; }
function getDiscussionSwitchId(id) { return "discussion-" + id + "-switch"; }
function getCommentId(id) { return "comment-" + id; }

function getActiveDiscussion()
{
   return globals.discussion.current;
}

function easyDiscussion(id)
{
   var eid = getDiscussionId(id);
   var discussion = document.getElementById(eid);

   if(!discussion)
   {
      var dswitch = cloneTemplate("discussionswitch");
      findSwap(dswitch, "data-id", getDiscussionSwitchId(id));
      discussionswitcher.appendChild(dswitch);

      log.Debug("Creating container + switcher for discussion " + id);
      discussion = cloneTemplate("discussion");
      multiSwap(discussion, {
         "data-id": eid,
         "data-discussionid": id
      });
      discussions.appendChild(discussion);

   }

   return discussion;
}

function easyShowDiscussion(id)
{
   //The true/false isn't necessary, just as a visual reminder that that
   //function accepts a truthy value for whether it has discussions
   setHasDiscussions(id ? true : false);
   globals.discussion.current = id; //Whatever they send, it's what the current is

   if(id)
   {
      var d = easyDiscussion(id);
      setTimeout(x => 
      {
         document.getElementById(getDiscussionSwitchId(id)).firstElementChild.click();

         //Is this going to be ok???
         globals.discussion.observer.disconnect();
         globals.discussion.observer.observe(discussions);
         globals.discussion.observer.observe(d);
      }, 12);
   }
}

function updateCommentFragment(comment, element)
{
   //nothing for now, but there might be other things
   multiSwap(element, {
      "data-message": comment.content,
   });
   findSwap(element, "data-editdate", (new Date(comment.editDate).toLocaleString()));
}

function getFragmentFrame(element)
{
   return Utilities.FindParent(element, x => x.hasAttribute("data-messageframe"));
}

function easyComments(comments, users)
{
   if(comments)
      sortById(comments).forEach(x => easyComment(x, users));
}

function easyComment(comment, users)
{
   //First, find existing comment. If it's there, just update information?
   var existing = document.getElementById(getCommentId(comment.id));

   //Do different things depending on if it's an edit or not.
   if(existing)
   {
      if(comment.deleted)
      {
         log.Debug("Removing comment " + comment.id);
         var prnt = Utilities.RemoveElement(existing); 

         if(!prnt.firstElementChild)
         {
            log.Debug("Message frame containing comment " + comment.id + " empty, removing frame");
            Utilities.RemoveElement(getFragmentFrame(prnt));
         }
      }
      else
      {
         updateCommentFragment(comment, existing);
      }
   }
   else
   {
      //Comment was never added but we're getting a delete message? Ignore it
      if(comment.deleted)
      {
         log.Warn("Ignoring comment delete: " + comment.id);
         return;
      }

      //Automatically create discussion?
      var d = easyDiscussion(comment.parentId);

      //Starting from bottom, find place to insert.
      var comments = d.querySelectorAll("[data-messageid]");
      var insertAfter = false;

      for(var i = comments.length - 1; i >= 0; i--)
      {
         //This is the place to insert!
         if(comment.id > Number(getSwap(comments[i], "data-messageid")))
         {
            insertAfter = comments[i];
            break;
         }
      }

      //Oops, this really shouldn't happen!!
      if(!insertAfter)
      {
         throw "Didn't find a place to insert comment " + comment.id + 
            " into discussion " + comment.parentId;
      }

      var insertFrame = getFragmentFrame(insertAfter);

      //Oops, we need a new frame
      if(Number(getSwap(insertFrame, "data-userid")) !== Number(comment.createUserId))
      {
         //create a frame to insert into
         var frame = makeCommentFrame(comment, users);
         Utilities.InsertAfter(frame, insertFrame);
         insertAfter = frame.querySelector(".messagelist").firstChild;
      }

      var fragment = makeCommentFragment(comment);
      updateCommentFragment(comment, fragment);

      var messageController = fragment.querySelector(".messagecontrol");
      messageController.addEventListener("click", messageControllerEvent);

      Utilities.InsertAfter(fragment, insertAfter);
   }
}

function messageControllerEvent(event)
{
   var omsg = Utilities.FindParent(event.target, x => x.hasAttribute("data-singlemessage"));
   var oframe = getFragmentFrame(omsg);

   var msg = omsg.cloneNode(true);
   var frame = oframe.cloneNode(true);
   var msglist = frame.querySelector(".messagelist");
   msglist.innerHTML = "";
   msglist.appendChild(msg);
   Utilities.RemoveElement(msg.querySelector(".messagecontrol"));

   var cmid = getSwap(msg, "data-messageid");
   var rawcm = getSwap(msg, "data-message"); 
   var msgdate = getSwap(msg, "data-createdate");
   var msgedate = getSwap(msg, "data-editdate");
   findSwap(frame, "data-frametime", msgdate);

   commenteditpreview.innerHTML = "";
   commenteditpreview.appendChild(frame);

   var parsedcm = parseComment(rawcm);
   commentedittext.value = parsedcm.t;
   commenteditformat.value = parsedcm.m;
   commenteditinfo.textContent = "ID: " + cmid + "  UID: " + getSwap(frame, "data-userid");
   if(msgedate !== msgdate) commenteditinfo.textContent += "  Edited: " + msgedate;

   commenteditdelete.onclick = function() 
   { 
      if(confirm("Are you SURE you want to delete this comment?"))
      {
         quickApi("comment/" + cmid + "/delete", x => notifySuccess("Comment deleted"),
            x => notifyError("Couldn't delete comment: " + x.status + " - " + x.statusText),
            {});
         UIkit.modal(commentedit).hide();
      }
   };

   commenteditedit.onclick = function() 
   { 
      quickApi("comment/" + cmid, x => notifySuccess("Comment edited"),
         x => notifyError("Couldn't edit comment: " + x.status + " - " + x.statusText),
         {parentId : Number(getActiveDiscussion()), 
          content: createComment(commentedittext.value, commenteditformat.value)},
         undefined, /*always*/ "PUT");
      UIkit.modal(commentedit).hide();
   };

   commenteditshowpreview.onclick = function() 
   { 
      findSwap(msg, "data-message", createComment(commentedittext.value, commenteditformat.value));
   };
}

// **********************
// ---- LONG POLLING ----
// **********************

function setConnectionState(state)
{
   state = state || "";
   var indicator = document.querySelector("[" + attr.constate + "]");
   indicator.setAttribute(attr.constate, state);
}

function tryAbortLongPoller()
{
   if(globals.longpoller.pending)
   {
      log.Debug("Aborting old long poller...");
      globals.longpoller.pending.abort();
      return true;
   }

   return false;
}

function updateLongPoller()
{
   log.Info("Updating long poller, may restart");

   //Just always abort, if they want an update, they'll GET one
   tryAbortLongPoller();

   if(!getToken())
      return;

   var cid = getActiveDiscussion();

   //A full reset haha great
   if(cid)
   {
      globals.longpoller.lastlisteners = { };
      globals.longpoller.lastlisteners[String(cid)] = { "0" : "" }; 
   }
   else
   {
      globals.longpoller.lastlisteners = null;
   }

   longpollRepeater();
}

function longpollRepeater()
{
   setConnectionState("connected");

   var statuses = {};
   var cid = getActiveDiscussion();
   if(cid) statuses[String(cid)] = "online";
   var clearNotifications = Object.keys(statuses).map(x => Number(x));

   var params = new URLSearchParams();
   params.append("actions", JSON.stringify({
      "lastId" : globals.lastsystemid,
      "statuses" : statuses,
      "clearNotifications" : clearNotifications,
      "chains" : [ "comment.0id", "activity.0id", "watch.0id",
         "user.1createUserId.2userId", "content.1parentId.2contentId.3contentId" ]
   }));

   if(globals.longpoller.lastlisteners)
   {
      params.append("listeners", JSON.stringify({
         "lastListeners" : globals.longpoller.lastlisteners,
         "chains" : [ "user.0listeners" ]
      }));
   }

   params.set("user","id,username,avatar");
   params.set("content","id,name");

   quickApi("read/listen?" + params.toString(), data => //success
   {
      if(data)
      {
         globals.lastsystemid = data.lastId;

         var users = idMap(data.chains.user);
         var watchlastids = getWatchLastIds();
         updatePulse(data.chains);

         if(data.chains.comment)
         {
            //I filter out comments from watch updates if we're currently in
            //the room. This should be done automatically somewhere else... mmm
            data.chains.commentaggregate = commentsToAggregate(
               data.chains.comment.filter(x => watchlastids[x.parentId] < x.id && 
                  clearNotifications.indexOf(x.parentId) < 0));
            handleAlerts(data.chains.comment, users);
            easyComments(data.chains.comment, users);
         }

         if(data.chains.activity)
         {
            data.chains.activityaggregate = activityToAggregate(
               data.chains.activity.filter(x => watchlastids[x.contentId] < x.id &&
                  clearNotifications.indexOf(x.contentId) < 0));
         }

         console.datalog("watchlastids: ", watchlastids);
         console.datalog("chatlisten: ", data);
         updateWatches(data.chains);

         if(data.listeners)
         {
            globals.longpoller.lastlisteners = data.listeners;
            updateDiscussionUserlist(data.listeners, users);
         }
      }

      longpollRepeater();

   }, req => //error
   {
      if(req.status === 400)
      {
         setConnectionState("error");
         UIkit.modal.confirm("Live updates cannot recover from error. " +
            "Press OK to reload page.\n\nIf you " +
            "CANCEL, the website will not function properly!").then(x =>
         {
            location.reload();
         });
      }
      else if(req.status || req.networkError)
      {
         setConnectionState("error");
         var lpr = getLocalOption("longpollerrorrestart");
         log.Error("Long poller failed, status: " + req.status + ", retrying in " + lpr + " ms");
         setTimeout(longpollRepeater, lpr);
      }
      else
      {
         setConnectionState("aborted");
         log.Warn("Long poller was aborted!");
      }
   }, undefined, req => //Always
   {
      globals.longpoller.pending = false;
   }, undefined, req => //modify
   {
      globals.longpoller.pending = req;
   }, !getLocalOption("loglongpollrequest") /* Do we want this? No logging? */);
}

function handleAlerts(comments, users)
{
   //Figure out the comment that will go in the header
   if(comments && Notification.permission === "granted" && getLocalOption("displaynotifications"))
   {
      var alertids = getWatchLastIds();
      var activedisc = getActiveDiscussion();

      //Add our current room ONLY if it's invisible
      if(!document.hidden) //Document is visible, NEVER alert the current room
         delete alertids[activedisc];
      else if(!alertids[activedisc]) //Document is invisible, alert IF it's not already in the list
         alertids[activedisc] = 0;

      var cms = sortById(comments).filter(x => alertids[x.parentId] < x.id &&
         x.editDate === x.createDate); //NO COMMENTS

      try
      {
         cms.forEach(x => 
         {
            //this may be dangerous
            var pw = document.getElementById(pulseId(x.parentId));
            var name = getSwap(pw, "data-pwname");
            var notification = new Notification(users[x.createUserId].username + ": " + name, {
               tag : "comment" + x.id,
               body : parseComment(x.content).t,
               icon : getAvatarLink(users[x.createUserId].avatar, 100),
            });
         });
      }
      catch(ex)
      {
         log.Error("Could not send notification: " + ex);
      }
   }
}

//A 12me thing for the renderer
var Nav = {
   link: function(path, element) {
      var a = cloneTemplate("sbslink");
      multiSwap(a, { "data-link" : "?p=" + path.replace(/s?\//g, "-") });
      finalizeTemplate(a);
      return a;
   }
};
