
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
   "atoldest" : "data-atoldest"
};

//Will this be stored in user eventually?
var options = {
   displaynotifications : { def : true, text : "Device Notifications" },
   loadcommentonscroll : { def: true, text : "Auto load comments on scroll (buggy)" },
   quickload : { def: true, text : "Load parts of page as they become available" },
   collapsechatinput : { def: true, text : "Collapse chat textbox" },
   watchclearnotif : {def: false, text : "Watch clear toast" },
   datalog : { def: false, text : "Log received data objects" },
   drawlog : { def: false, text : "Log custom render data" },
   domlog : { def: false, text : "Log major DOM manipulation" },
   loglongpollrequest : { def: false, text : "Log longpoller outgoing request" },
   imageresolution : { def: 1, text: "Image resolution scale", step : 0.05 },
   filedisplaylimit: { def: 40, text : "Image select files per page" },
   pagedisplaylimit: { def: 100, text: "Display pages per category" },
   initialloadcomments: { def: 30, text: "Initial comment pull" },
   oldloadcomments : { def: 30, text: "Scroll back comment pull" },
   discussionscrollspeed : { def: 0.25, text: "Scroll animation (1 = instant)", step: 0.01 },
   discussionscrolllock : { def: 0.15, text: "Page height % chat scroll lock", step: 0.01 },
   notificationtimeout : { def: 5, text: "Notification timeout (seconds)" },
   forcediscussionoutofdate : {def: false },
   retrievetechnicalinfo : {def:true },
   pulsepasthours : { def: 24 },
   discussionavatarsize : { def: 60 },
   showsidebarminrem : { def: 60 },
   refreshcycle : { def: 10000 },
   discussionscrollnow : {def: 1000 },
   longpollerrorrestart : {def: 5000 },
   signalcleanup : {def: 10000 },
   //logsignals : { //Eventually I'll do this?
   scrolldiscloadheight : {def: 1.0, step: 0.01 },
   defaultmarkup : {def:"12y"}
};

var globals = { 
   lastsystemid : 0,    //The last id retrieved from the system for actions
   reqId : 0,           //Ever increasing request id
   spahistory : [],
   longpoller : {}
};

//Some um... global sturf uggh
log.Datalog = (d,e,f) => { if(getLocalOption("datalog")) log.Trace(d,e,f); };
log.Drawlog = (d,e,f) => { if(getLocalOption("drawlog")) log.Trace(d,e,f); };
log.Domlog =  (d,e,f) => { if(getLocalOption("domlog")) log.Trace(d,e,f); };

DomDeps.log = (d,e,f) => log.Domlog(d,e,f);
DomDeps.signal = (name, data) => signals.Add(name, data);

window.Notification = window.Notification || {};

window.onerror = function(message, source, lineno, colno, error)
{
   notifyError(message + "\n(" + source + ":" + lineno + ")"); 
};

//OK now we can finally load and do things?
window.onload = function()
{
   log.Info("Window load event");

   setupSignalProcessors();

   var ww = Utilities.ConvertRem(Utilities.WindowWidth());
   log.Debug("Width REM: " + ww + ", pixelRatio: " + window.devicePixelRatio);

   writeDom(() =>
   {
      if(ww >= getLocalOption("showsidebarminrem"))
         rightpanetoggle.click();

      initializePage("pageload");
   });

   setupSpa();

   //Little setup here and there
   UIkit.util.on('#logsparent', 'show', () => writeDom(() => renderLogs(log)));

   setupTechnicalInfo();
   setupUserStuff();
   setupFileUpload();
   setupPageControls();
   setupDiscussions();
   setupTheme();

   setupSession();

   //Regardless if you're logged in or not, this will work "correctly" since
   //the spa processor will take your login state into account. And if you're
   //not "REALLY" logged in, well whatever, better than processing it twice.
   globals.spa.ProcessLink(document.location.href);
   refreshCycle();

   //Begin render
   globals.render = { lastrendertime : performance.now() };
   requestAnimationFrame(renderLoop);
};

function safety(func)
{
   try { func(); }
   catch(ex)
   {
      notifyError("Failed: " + ex.message);
      console.log("safety exception: ", ex);
   }
}


// ***************************
// --- CYCLES (TIMERS ETC) ---
// ***************************

function refreshCycle()
{
   writeDom(() =>
   {
      refreshPWDates(pulse);
      refreshPWDates(watches);
   });

   signals.ClearOlderThan(performance.now() - getLocalOption("signalcleanup"));

   //This is called instead of setInterval so users can change this and have it
   //update immediately
   globals.refreshCycle = setTimeout(refreshCycle, getLocalOption("refreshcycle"));
}

function renderLoop(time)
{
   try
   {
      var delta = time - globals.render.lastrendertime;

      //FIRST, do all the stuff that requires reading the layout
      signals.Process("formatdiscussions", time);

      //NEXT, do stuff where the order doesn't matter
      signals.ProcessAuto(time);

      //THEN, do all the stuff that requires modifying the layout,
      //DO NOT read past this point EVER!
      signals.Process("wdom", time);

      globals.render.lastrendertime = time;
      requestAnimationFrame(renderLoop);
   }
   catch(ex)
   {
      UIkit.modal.alert(
         "WEBSITE FULL CRASH: renderLoop failed with exception: " + ex + " (see dev tools log)")
      console.log("renderLoop exception: ", ex);
   }
}


// ********************
// ---- SETUP CODE ----
// ********************

function setupSignalProcessors()
{
   //THESE signals need to be run manually, because the order matters
   ["wdom", "formatdiscussions"].forEach(x => signals.AddAutoException(x));

   //Some of these signals are treated as plain "events" so I don't have to do
   //proper dependency injection and interfacing and all that, this is a 
   //simple-ish project. They should follow the _event convention to distinguish them
   signals.Attach("wdom", data => data());
   signals.Attach("loadoldercomments_event", data => loadOlderComments(data));
   signals.Attach("spaclick_event", data => globals.spa.ProcessLinkContextAware(data.url));
   signals.Attach("localsettingupdate_event", data => 
   {
      log.Info("Setting " + data.key + " to " + data.value);
      setLocalOption(data.key, data.value);
      handleSetting(data.key, data.value);
   });

   //Oh but there's some fun stuff I also want to do on events (not the event itself)
   signals.Attach("spastart", parsed => quickLoad(parsed));

   //These are so small I don't care about them being directly in here
   var apiSetLoading = (data, load) => 
   {
      if(!data.endpoint.endsWith("listen"))
         writeDom(() => { if(load) addLoading(); else removeLoading(); });
   };

   signals.Attach("apistart", data => apiSetLoading(data, true));
   signals.Attach("apiend", data => apiSetLoading(data, false));

   signals.Attach("showdiscussion", data =>
   {
      globals.discussion.observer.observe(discussions);
      globals.discussion.observer.observe(data.discussion);
   });
   signals.Attach("hidediscussion", data =>
   {
      globals.discussion.observer.disconnect();
   });
   signals.Attach("formatdiscussions", data =>
   {
      //Want to scroll to bottom, this performs a READ
      discussions.scrollTop = discussions.scrollHeight;
   });

   signals.Attach("settheme", data => 
   {
      writeDom(() => darkmodetoggle.innerHTML = (data === "dark") ? "&#x2600;" : "&#x1F311;");
   });
}

function setupSpa()
{
   globals.spa = new BasicSpa(log);

   //For now, we have ONE processor!
   globals.spa.Processors.push(new SpaProcessor(url => true, (url, rid) =>
   {
      var spadata = parseLink(url);
      spadata.rid = rid;
      spadata.route = "route" + spadata.page;

      var loadFunc = window[spadata.route + "_load"];

      if(!loadFunc)
      {
         pageerror("SPA process", "Couldn't find loader for page " + data.page);
         return;
      }

      //Alert anybody else who wants to know that we've done a click
      signals.Add("spastart", spadata);
      loadFunc(spadata);
   }));

   globals.spa.SetHandlePopState();

   log.Debug("Setup SPA, override handling popstate");
}

function setupTechnicalInfo()
{
   if(getLocalOption("retrievetechnicalinfo"))
   {
      quickApi("test/info", (data) =>
      {
         log.Debug("Received technical info from API");

         writeDom(() =>
         {
            multiSwap(technicalinfo, {
               "data-apiroot": apiroot,
               "data-apiversion": data.versions.contentapi,
               "data-entitysystemversion": data.versions.entitysystem
            });
         });
      });
   }
}

function setupPageControls()
{
   var makeSet = f => function(event) 
   { 
      event.preventDefault(); 
      writeDom(f);
   };

   fulldiscussionmode.onclick = makeSet(setFullDiscussionMode);
   fullcontentmode.onclick = makeSet(setFullContentMode);
   splitmodecontent.onclick = makeSet(setSplitMode);
   splitmodediscussion.onclick = makeSet(setSplitMode);

   log.Debug("Setup page controls");
}

function setupUserStuff()
{
   formSetupSubmit(loginform, "user/authenticate", token => login(token));
   userlogout.addEventListener("click", () => logout());

   formSetupSubmit(passwordresetform, "user/passwordreset/sendemail", result =>
   {
      log.Info("Password reset code sent!");
      writeDom(() => passwordresetstep2.click()); //don't know if clicks need to be set up like this...
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
      writeDom(() => registrationstep2.click());
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
         quickApi("user/basic", data => updateCurrentUserData(data), undefined, 
            { "avatar" : id }, undefined, "PUT"); 
      };
   });

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


   allowNotifications.onclick = () => Notification.requestPermission();

   refreshlocaloptions.onclick = event => {
      event.preventDefault();
      refreshOptions();
   };

   refreshOptions();

   log.Debug("Setup all user forms");
}

function setupFileUpload()
{
   var resetFileUploadList = () => 
   {
      log.Debug("Refreshing file upload images");
      setFileUploadList(0, fileuploadsearchall.checked);
      signals.Add("refreshfileupload", { page: 0, all: fileuploadsearchall.checked });
   };

   UIkit.util.on('#fileupload', 'beforeshow', resetFileUploadList);
   fileuploadsearchall.addEventListener("change", resetFileUploadList);

   //this is the "dynamic loading" to save data: only load big images when
   //users click on them
   UIkit.util.on("#fileuploadslideshow", "beforeitemshow", e => writeDom(() => 
      e.target.firstElementChild.src = e.target.firstElementChild.getAttribute("data-src")));

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
   var generalError = () => writeDom(() => {
      if(typeof arguments[0] == 'XMLHttpRequest')
         formError(fileuploadform, arguments[0].status + ": " + arguments[0].message);
      else
         formError(fileuploadform, arguments[0]);
      bar.setAttribute('hidden', 'hidden');
   });
   var generalProgress = e => writeDom(() => { bar.max = e.total; bar.value = e.loaded; });

   UIkit.upload('#fileuploadform', {
      url: apiroot + '/file',
      multiple: false,
      mime: "image/*",
      name: "file",
      beforeSend: e => { e.headers["Authorization"] = "Bearer " + getToken(); },
      loadStart: e => writeDom(() => { bar.removeAttribute('hidden'); bar.max = e.total; bar.value = e.loaded; }),
      progress: e => generalProgress,
      loadEnd: e => generalProgress,
      error: generalError,
      fail: generalError,
      completeAll: function () {
         log.Info("Upload complete");
         writeDom(() => 
         {
            addFileUploadImage(JSON.parse(arguments[0].responseText), fileuploaditems.childElementCount);
            setTimeout(function () { 
               bar.setAttribute('hidden', 'hidden'); 
               fileuploadthumbnails.lastElementChild.firstElementChild.click();
            }, 200); // for some reason, must wait before can click
         });
      }
   });

   log.Debug("Setup all file uploading/handling");
}

function setupTheme()
{
   darkmodetoggle.onclick = event =>
   {
      event.preventDefault();
      setTheme(document.body.getAttribute("data-theme") ? "" : "dark");
   };

   setTheme(localStorage.getItem("usertheme"));
}


// ***************
// --- ROUTING ---
// ***************

//Data is SPA for all these

//Handle a spa route completion event, assuming all the data was loaded/etc
function route_complete(spadat, title, applyTemplate, breadcrumbs)
{
   //If we are the LAST request, go ahead and finalize the process.
   if(spadat.rid === globals.spa.requestId)
   {
      if(breadcrumbs)
         breadcrumbs.forEach(x => x.link = x.link || (x.content ? getPageLink(x.id) : getCategoryLink(x.id)));

      writeDom(() =>
      {
         renderPage(spadat.route, applyTemplate, breadcrumbs);
         if(title)
            document.title = title + " - SmileBASIC Source";
         else
            document.title = "SmileBASIC Source";
         globals.spahistory.push(spadat);
      });

      signals.Add("routecomplete", { spa : spadat });
   }
   else
   {
      log.Warn("Ignoring page finalization: " + spadat.url);
   }
}

function pageerror(title, message)
{
   writeDom(() =>
   {
      renderPage("routeerror", template => safety(() => 
      {
         multiSwap(template, {
            "data-message" : data.message,
            "data-title" : data.sender
         });
      }));

      signals.Add("pageerror", {title: title, message: message});
   });
}

function routehome_load(spadat) { route_complete(spadat); }

function routecategory_load(spadat)
{
   var cid = Number(spadat.id);
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
      log.Datalog(data);

      var users = idMap(data.user);
      var categories = idMap(data.category);
      var c = categories[cid] || { "name" : "Website Root", "id" : 0 };

      route_complete(spadat, "Category: " + c.name, templ =>
      {
         var sbelm = templ.querySelector("[data-subcats]");
         var pgelm = templ.querySelector("[data-pages]");
         var childcats = data.category.filter(x => x.parentId === cid);

         multiSwap(templ, { "data-title" : c.name });
         childcats.forEach(x => sbelm.appendChild(makeSubcat(x)));
         data.content.forEach(x => pgelm.appendChild(makePageitem(x, users)));
      }, getChain(data.category, c));
   });
}

function routepage_load(spadat)
{
   var initload = getLocalOption("initialloadcomments");
   var pid = Number(spadat.id);

   var params = new URLSearchParams();
   params.append("requests", "content-" + JSON.stringify({"ids" : [pid], "includeAbout" : true}));
   params.append("requests", "category");
   params.append("requests", "comment-" + JSON.stringify({
      "Reverse" : true,
      "Limit" : initload,
      "ParentIds" : [ pid ]
   }));
   params.append("requests", "user.0createUserId.0edituserId.2createUserId");
   params.set("category", "id,name,parentId");

   quickApi("read/chain?" + params.toString(), function(data)
   {
      log.Datalog(data);

      var c = data.content[0];
      var users = idMap(data.user);

      route_complete(spadat, c.name, templ =>
      {
         setupContentDiscussion(templ, c, data.comment, users, initload);
      }, getChain(data.category, c));
   });
}

//This is EXTREMELY similar to pages, think about doing something different to
//minimize duplicate code???
function routeuser_load(spadat)
{
   var initload = getLocalOption("initialloadcomments");
   var uid = Number(spadat.id);

   var params = new URLSearchParams();
   params.append("requests", "user-" + JSON.stringify({"ids" : [uid]}));
   params.append("requests", "content-" + JSON.stringify({
      "createUserIds" : [uid],
      "type" : "@user.page",
      "includeAbout" : true,
      "limit" : 1
   }));
   params.append("requests", "comment.1id$ParentIds-" + JSON.stringify({
      "Reverse" : true,
      "Limit" : initload
   }));
   params.append("requests", "user.1createUserId.1edituserId.2createUserId");

   quickApi("read/chain?" + params.toString(), function(data)
   {
      log.Datalog(data);
      var users = idMap(data.user);
      var u = users[uid];
      var c = data.content[0];
      u.name = u.username;
      u.link = getUserLink(u.id);

      route_complete(spadat, "User: " + u.username, templ =>
      {
         multiSwap(templ, {
            "data-title" : u.username,
            "data-avatar" : getAvatarLink(u.avatar, 100)
         });

         if(c)
         {
            c.name = u.username;
            setupContentDiscussion(templ, c, data.comment, users, initload);
         }
         else
         {
            multiSwap(templ, { "data-content": "No user page" });
         }
      }, [u]);
   });
}

// *******************
// --- SPECIAL DOM ---
// *******************

//Set page state or whatever for the given key. It doesn't have to have
//changed, just call this whenever you want to set the state for the key
function handleSetting(key, value)
{
   if(key === "collapsechatinput")
   {
      if(value)
         postdiscussiontext.removeAttribute("data-expand");
      else
         postdiscussiontext.setAttribute("data-expand", "");
   }
}

function quickLoad(spadat)
{
   if(getLocalOption("quickload"))
   {
      writeDom(() =>
      {
         //If it comes time for us to run the page init but the request that
         //spawned us already finished, well don't initialize!!
         if(globals.spahistory.some(x => x.rid === spadat.rid))
         {
            log.Warn("Tried to initialize page for quickload, but it already started!");
            return;
         }
         initializePage("quickload");
         unhide(maincontentloading);
         if(typeHasDiscussion(spadat.page) && spadat.page !== "user")
         {
            showDiscussion(Number(spadat.id));
            formatDiscussions(true);
         }
      });
   }
}

function refreshOptions()
{
   writeDom(() =>
   {
      for(key in options)
      {
         options[key].value = getLocalOption(key);
         handleSetting(key, options[key].value);
      }
      renderOptions(options);
   });
}

function setTheme(theme)
{
   writeDom(() =>
   {
      if(theme)
      {
         document.body.setAttribute("data-theme", theme);
         localStorage.setItem("usertheme", theme);
      }
      else
      {
         document.body.removeAttribute("data-theme");
         localStorage.removeItem("usertheme");
      }

      signals.Add("settheme", theme);
   });
}

function setFileUploadList(page, allImages)
{
   writeDom(() =>
   {
      fileuploaditems.innerHTML = "<div uk-spinner='ratio: 3'></div>";
      fileuploadthumbnails.innerHTML = "";
   });

   var fdl = getLocalOption("filedisplaylimit");
   var url = "file?reverse=true&limit=" + fdl + "&skip=" + (fdl * page);
      
   if(!allImages)
      url += "&createuserids=" + getUserId();

   quickApi(url, files =>
   {
      fileuploadnewer.onclick = e => { e.preventDefault(); setFileUploadList(page - 1, allImages); }
      fileuploadolder.onclick = e => { e.preventDefault(); setFileUploadList(page + 1, allImages); }

      writeDom(() =>
      {
         fileuploaditems.innerHTML = "";
         for(var i = 0; i < files.length; i++)
            addFileUploadImage(files[i], i);

         setHidden(fileuploadnewer, page <= 0);
         setHidden(fileuploadolder, files.length !== fdl);
      });
   });
}

function addFileUploadImage(file, num)
{
   var fItem = cloneTemplate("fupmain");
   var fThumb = cloneTemplate("fupthumb");
   multiSwap(fItem, { 
      "data-imgsrc": getComputedImageLink(file.id) 
   });
   multiSwap(fThumb, {
      "data-imgsrc": getComputedImageLink(file.id, 60, true),
      "data-number": num,
      "data-fileid": file.id
   });
   fileuploaditems.appendChild(fItem);
   fileuploadthumbnails.appendChild(fThumb);
}

function updateCurrentUserData(user)
{
   writeDom(() =>
   {
      //Just username and avatar for now?
      navuseravatar.src = getAvatarLink(user.avatar, 40);
      userusername.firstElementChild.textContent = user.username;
      userusername.href = getUserLink(user.id);
      userid.textContent = "User ID: " + user.id;
      userid.setAttribute("data-userid", user.id);  //Can't use findSwap: it's an UPDATE
      finalizeTemplate(userusername); //be careful with this!
      //Check fields in user for certain special fields like email etc.
      signals.Add("updatecurrentuser", user);
   });
}

function setupContentDiscussion(templ, content, comments, users, initload)
{
   unhide(templ.querySelector(".pagecontrols"));
   multiSwap(templ, {
      "data-title" : content.name,
      "data-content" : JSON.stringify({ "content" : content.content, "format" : content.values.markupLang }),
      "data-format" : content.values.markupLang,
      "data-watched" : content.about.watching
   });
   setupWatchLink(templ, content.id);
   var d = getDiscussion(content.id);
   if(comments.length !== initload)
      d.setAttribute(attr.atoldest, "");
   showDiscussion(content.id);
   easyComments(comments, users);
   formatDiscussions(true);
}

//This is actually required by index.html... oogh dependencies
function renderContent(elm, repl)
{
   if(repl)
   {
      elm.setAttribute("data-rawcontent", repl);
      elm.innerHTML = "";
      try
      {
         var content = JSON.parse(repl);
         elm.appendChild(Parse.parseLang(content.content, content.format));
      }
      catch(ex)
      {
         log.Warn("Couldn't parse content, rendering as-is: " + ex);
         elm.textContent = repl;
      }
   }

   return elm.getAttribute("data-rawcontent");
}


// *********************
// --- NOTIFICATIONS ---
// *********************

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
            var pw = document.getElementById(getPulseId(x.parentId));
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


// ***************************
// ---- GENERAL UTILITIES ----
// ***************************

//Note: cascading dom writes should USUALLY be handled in the same frame UNLESS
//there's something in the middle that's deferred (time set)
function writeDom(func) { signals.Add("wdom", func); }

function login(token) { setToken(token); location.reload(); }
function logout() { setToken(null); location.reload(); }

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

function getComputedImageLink(id, size, crop, ignoreRatio)
{
   if(size)
   {
      size = Math.max(10, Math.floor(size * getLocalOption("imageresolution") * 
            (ignoreRatio ? 1 : window.devicePixelRatio))); 
   }

   return getImageLink(id, size, crop);
}

function getAvatarLink(id, size, ignoreRatio) { return getComputedImageLink(id, size, true, ignoreRatio); }

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

function parseLink(url)
{
   var pVal = Utilities.GetParams(url).get("p") || "home"; 
   var pParts = pVal.split("-");
   return {
      url : url,
      p : pVal,
      page : pParts[0],
      id : pParts[1]
   };
}


// ***********************
// ---- TEMPLATE CRAP ----
// ***********************

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

function makeSubcat(category)
{
   var subcat = cloneTemplate("subcat");
   multiSwap(subcat, {
      "data-link": getCategoryLink(category.id),
      "data-name": category.name
   });
   finalizeTemplate(subcat);
   return subcat;
}

function makePageitem(page, users)
{
   var citem = cloneTemplate("pageitem");
   var u = users[page.createUserId] || {};
   var date = (new Date(page.createDate)).toLocaleDateString();
   multiSwap(citem, {
      "data-link": getPageLink(page.id),
      "data-name": page.name,
      "data-avatar" : getAvatarLink(u.avatar, 50, true),
      "data-userlink" : getUserLink(page.createUserId),
      "data-time" : date
   });
   finalizeTemplate(citem);
   return citem;
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



//-------------------------------------------------
// ***********************************************
// ***********************************************
// ***********************************************
//    --- ALREADY HANDLED ABOVE THIS POINT ---
// ***********************************************
// ***********************************************
// ***********************************************
//-------------------------------------------------




//Right now, this can only be called once :/
function setupDiscussions()
{
   globals.discussions = {};
   globals.discussion =
   { 
      "lastanimtime" : 0,
      "observer" : new ResizeObserver(entries => 
      {
         var scdst = scrollDiscussionsDistance(globals.discussion.scrollHeight);

         if((globals.discussion.rect && globals.discussion.scrollHeight && scdst >= 0 &&
             scdst < (globals.discussion.rect.height * getLocalOption("discussionscrolllock"))) ||
             performance.now() < globals.discussion.scrollNow)
         {
            //log.Warn("Setting scrollnow to " + discussions.scrollTop + " with dst: " +
            //   scdst + ", ht: " + globals.discussion.rect.height + ", osclht: " + 
            //   globals.discussion.scrollHeight + ", slcht: " + 
            //   discussions.scrollHeight);
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
      globals.fileselectcallback = function(id) { //TODO: this assumes 12y format
         postdiscussiontext.value += " !" + getComputedImageLink(id);
      };
   });

   //Begin the animation loop for discussion scrolling
   scrollDiscussionsAnimation(0);

   log.Debug("Setup discussions (scrolling/etc)");
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
      log.Datalog(data);

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


function refreshUserFull(always)
{
   //Make an API call to /me to get the latest data.
   quickApi("user/me", function(user)
   {
      updateCurrentUserData(user);
      //Don't set up the FULL session, you know? Someone else will do that
      setLoginState(true); 
   }, function(req)
   {
      //Assume any failed user refresh means they're logged out
      log.Error("Couldn't refresh user, deleting cached token");
      logout();
   }, undefined, always);
}

function updateDiscussionUserlist(listeners, users)
{
   var list = listeners ? listeners[getActiveDiscussion()] : {};

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


function getUserId() { return userid.dataset.userid; }

function formError(form, error)
{
   writeDom(() => form.appendChild(makeError(error)));
   log.Error(error);
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
      "data-useravatar": getComputedImageLink(u.avatar, 40, true),
      "data-username": u.username
   });

   return pulseuser;
}

// ***************
// ---- Pulse ----
// ***************


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
      aggregate[c.id] = { pulse: easyPWContent(c, getPulseId(c.id), pulse) };

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
      var watchdata = document.getElementById(getWatchId(cid)); 

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
         var watchdata = easyPWContent(c, getWatchId(c.id), watches);
         setupWatchClear(watchdata, c.id);
         watchdata.setAttribute(attr.pulsemaxid, data.watch[i].lastNotificationId);
      }
   }

   if(data.watchdelete)
   {
      for(var i = 0; i < data.watchdelete.length; i++)
      {
         var w = document.getElementById(getWatchId(data.watchdelete[i].contentId));
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
         var w = document.getElementById(getWatchId(data.watchupdate[i].contentId));

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



// ********************
// ---- Discussion ----
// ********************

function scrollDiscussionsDistance(baseHeight)
{
   var baseHeight = baseHeight || discussions.scrollHeight;
   return globals.discussion.rect ? (baseHeight - 
      (globals.discussion.rect.height + discussions.scrollTop)) : 0;
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
      log.Drawlog("scd: " + scd + ", scm: " + scm + ", delta: " 
         + delta + ", dst: " + discussions.scrollTop);
      //These are added separately because eventually, our scrolltop will move
      //past the actual assigned one
      globals.discussion.scrollTop = Math.ceil(globals.discussion.scrollTop + scm);
      discussions.scrollTop = globals.discussion.scrollTop;
      log.Drawlog("New dst: " + discussions.scrollTop + ", gst: " +
         globals.discussion.scrollTop);
   }

   var activeDiscussion = document.getElementById(getDiscussionId(getActiveDiscussion()));

   //TODO: Get this out of here, needs to be part of something else!
   if(discussions.scrollTop < globals.discussion.lastScrollTop && 
      activeDiscussion && getLocalOption("loadcommentonscroll") &&
      discussions.scrollTop < getLocalOption("scrolldiscloadheight") * window.innerHeight &&
      !globals.discussion.loadingOlder && !activeDiscussion.hasAttribute(attr.atoldest))
   {
      loadOlderComments(activeDiscussion);
   }

   globals.discussion.lastScrollTop = discussions.scrollTop;
   globals.discussion.lastanimtime = timestamp;
   window.requestAnimationFrame(scrollDiscussionsAnimation);
}

function loadOlderComments(discussion)
{
   globals.discussion.loadingOlder = true;

   var did = getSwap(discussion, "data-discussionid");
   log.Info("Loading older messages in " + did);

   var loading = discussion.querySelector("[data-loadolder] [data-loading]");
   unhide(loading);

   var minId = Number.MAX_SAFE_INTEGER;
   var msgs = discussion.querySelectorAll("[data-msgid]");

   for(var i = 0; i < msgs.length; i++)
      minId = Math.min(minId, msgs[i].getAttribute("data-msgid"));

   var initload = getLocalOption("oldloadcomments");
   var params = new URLSearchParams();
   params.append("requests", "comment-" + JSON.stringify({
      "Reverse" : true,
      "Limit" : initload,
      "ParentIds" : [ Number(did) ],
      "MaxId" : Number(minId)
   }));
   params.append("requests", "user.0createUserId.0edituserId");

   quickApi("read/chain?" + params.toString(), data =>
   {
      var users = idMap(data.user);
      var oldTop = discussions.scrollTop;
      var oldHeight = discussions.scrollHeight;
      easyComments(data.comment, users);
      discussions.scrollTop = oldTop + discussions.scrollHeight - oldHeight;
      if(data.comment.length !== initload)
         discussion.setAttribute(attr.atoldest, "");
   }, undefined, undefined, req =>
   {
      globals.discussion.loadingOlder = false;
      hide(loading);
   });
}

//Set the discussion to scroll, and if forceTime is set, CONTINUE scrolling
//even if the scroller shouldn't be (like the user is too far up)
function setDiscussionScrollNow(forceTime)
{
   globals.discussion.scrollTop = discussions.scrollTop;

   if(forceTime)
      globals.discussion.scrollNow = performance.now() + forceTime; 
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
      var d = getDiscussion(comment.parentId);

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
   event.preventDefault();
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

   UIkit.modal(commentedit).show();
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
