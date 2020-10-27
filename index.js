var apiroot = "https://newdev.smilebasicsource.com/api";

var actiontext = {
   "c" : "Create",
   "r" : "Read",
   "u" : "Edit",
   "d" : "Delete"
};

var activitytext = {
   "c" : "created",
   "r" : "read",
   "u" : "edited",
   "d" : "deleted"
};

var attr = {
   "pulsedate" : "data-maxdate",
   "pulsecount" : "data-pwcount",
   "pulsemaxid" : "data-pwmaxid",
   "atoldest" : "data-atoldest"
};

var rootCategory = { name : "Root", id : 0 }; //, "parentId" : undefined };
var everyoneUser = { username: "Everyone", avatar: 0, id: 0};

//Will this be stored in user eventually?
var options = {
   displaynotifications : { def : false, u: 1, text : "Device Notifications" },
   titlenotifications : { def : false, u: 1, text : "Title Notifications" },
   loadcommentonscroll : { def: true, u: 1, text : "Auto load comments on scroll (iOS buggy)" },
   quickload : { def: true, u: 1, text : "Load parts of page as they become available" },
   collapsechatinput : { def: false, u: 1, text : "Collapse chat textbox" },
   generaltoast : { def: true, u: 1, text : "Action toasts (mini alert)" },
   discussionscrollspeed : { def: 0.22, u: 1, text: "Scroll animation (1 = instant)", step: 0.01 },
   imageresolution : { def: 1, u: 1, text: "Image resolution scale", step : 0.05 },
   filedisplaylimit: { def: 40, u: 1, text : "Image select files per page" },
   pagedisplaylimit: { def: 1000, u: 1, text: "Display pages per category" },
   theme : {def: "light", u: 1, text: "Theme", options: [ "default", "dark", "contrast","blue","dark-contrast" ]},
   datalog : { def: false, text : "Log received data objects" },
   drawlog : { def: false, text : "Log custom render data" },
   domlog : { def: false, text : "Log major DOM manipulation" },
   apilog : { def: true, text : "Log API calls" },
   loglongpoll : { def: false, text : "Log longpoller events (could be many)" },
   loglongpollreq : { def: false, text : "Log longpoller requests" },
   logperiodicdata : { def: false, text : "Log runtime data every refresh cycle (FREQUENT)" },
   forcediscussionoutofdate : {def: false, text : "Force an immediate 400 error on long poll"},
   retrievetechnicalinfo : {def:true, text : "Pull API info on page load" },
   toastrequestoverload : {def:false, text : "Toast 429 (too many requests) errors" },
   initialloadcomments: { def: 30, text: "Initial comment pull" },
   oldloadcomments : { def: 30, text: "Scroll back comment pull" },
   activityload : { def: 100, text: "Activity load count" },
   discussionscrolllock : { def: 0.15, text: "Page height % chat scroll lock", step: 0.01 },
   discussionresizelock : { def: 20, text: "Device pixels to snap outer container resize" },
   notificationtimeout : { def: 5, text: "Notification timeout (seconds)" },
   breakchatmessagetime : { def: 600, text: "Seconds between split chat message" },
   pulsepasthours : { def: 24 },
   discussionavatarsize : { def: 60 },
   showsidebarminrem : { def: 60 },
   refreshcycle : { def: 10000 },
   longpollerrorrestart : {def: 5000 },
   minisearchtimebuffer : {def:200},
   signalcleanup : {def: 10000 },
   autohidesidebar : { def: 0.8, step: 0.01 },
   scrolldiscloadheight : {def: 1.5, step: 0.01 },
   scrolldiscloadcooldown : {def: 500 },
   frontpageslideshownum : {def:10},
   bgdiscussionmsgkeep : {def:30}, /* these are message BLOCKS, not individual */
   initialtab : {def:2},
   defaultmarkup : {def:"12y", options: [ "12y", "plaintext" ]},
   defaultpermissions: {def:"cr"}
};

var globals = { 
   lastsystemid : 0,    //The last id retrieved from the system for actions
   loadingOlderDiscussionsTime : 0,
   spahistory : []
};

//Some um... global sturf uggh
function logConditional(d, c, o)
{
   if(getLocalOption(o)) 
   { 
      log.Trace(d); 
      if(c) console.log(c); 
   } 
}

log.Datalog = (d,c) => logConditional(d, c, "datalog");
log.Drawlog = (d,c) => logConditional(d, c, "drawlog");
log.Domlog =  (d,c) => logConditional(d, c, "domlog");
log.Apilog =  (d,c) => logConditional(d, c, "apilog");

DomDeps.log = (d,c) => log.Domlog(d, c);
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

   //This is SO IMPORTANT that you can't do it on a frame, has to be done now
   finalizeTemplate(website);

   setupSignalProcessors();

   //These settings won't apply until next load ofc
   var signaller = (name, data) => signals.Add(name, data);

   globals.api = new Api(apiroot, signaller);
   globals.api.getToken = getToken;

   globals.longpoller = new LongPoller(globals.api, signaller, (m, c) => logConditional(m, c, "loglongpoll"));
   globals.longpoller.errortime = getLocalOption("longpollerrorrestart");
   globals.longpoller.instantComplete = handleLongpollData;
   interruptSmoothScroll();

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
   setupSearch();

   setupSession();

   //Regardless if you're logged in or not, this will work "correctly" since
   //the spa processor will take your login state into account. And if you're
   //not "REALLY" logged in, well whatever, better than processing it twice.
   globals.spa.ProcessLink(document.location.href);

   //Begin render
   globals.render = { lastrendertime : performance.now() };
   requestAnimationFrame(renderLoop);
   refreshCycle();

   //12's renderer replacements
   Parse.options.youtube = (args,preview) => 
   {
      var url = args[""];
      var yti = Utilities.ParseYoutube(url);
      var parseurl = null;
      if(yti.id)
      {
         parseurl = "https://www.youtube-nocookie.com/embed/"+yti.id+"?autoplay=1";
         if (yti.start) parseurl += "&start="+yti.start;
         if (yti.end) parseurl += "&end="+yti.end;
         if (yti.loop) parseurl += "&loop=1&playlist="+yti.id;
      }
      return {block:true, node:makeYoutube(url, parseurl)};
   };
   Parse.options.image = (args) =>
   {
      var img = cloneTemplate("contentimage");
      findSwap(img, "src", args[""]);
      finalizeTemplate(img);
      return {block:true, node:img};
   };
   StolenUtils.AttachResize(rightpane, rightpanefootername, true, -1, "halfe-sidebar");
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

   var ctime = getLocalOption("signalcleanup");
   var now = performance.now();

   if(getLocalOption("logperiodicdata"))
   {
      var message = "Periodic data:";
      message += "\nPollers: " + globals.longpoller.pending.map(x => "[" + x.rid + "]").join(", ");
      message += "\nSignals: " + Object.keys(signals.signals)
         .filter(x => signals.signals[x].length)
         .map(x => x + "[" + signals.signals[x].length + "]").join(", ");
      message += "\nLog buffer: " + log.messages.length;
      log.Debug(message);
   }

   //Oops, no rendering for a while, so process signals now. DON'T log this,
   //it's not necessary. if people need to know, enable periodic data, it will
   //tell if signals were processed
   if(now - globals.render.lastrendertime > Math.min(100, ctime / 3))
      signalProcess(now);

   signals.ClearOlderThan(now - ctime);

   //This is called instead of setInterval so users can change this and have it
   //update immediately
   globals.refreshCycle = setTimeout(refreshCycle, getLocalOption("refreshcycle"));
}

function signalProcess(now)
{
   //FIRST, do all the stuff that requires reading the layout
   signals.Process("formatdiscussions", now);

   //NEXT, do stuff where the order doesn't matter
   signals.ProcessAuto(now);

   //THEN, do all the stuff that requires modifying the layout,
   //DO NOT read past this point EVER!
   signals.Process("wdom", now);
}

function renderLoop(time)
{
   try
   {
      var delta = time - globals.render.lastrendertime;

      if(rightpane.clientWidth < 400)
         rightpane.setAttribute("data-condensed", "true");
      else 
         rightpane.removeAttribute("data-condensed");

      //Always read first!!! Check stuff here and then schedule actions for
      //later with signalling.
      var baseData = { 
         //Scrolldiff is current difference between this frame and last frame
         //(determines current scroll direction)
         scrollDiff: Math.floor(discussions.scrollTop) - Math.floor(globals.discussionScrollTop),
         //Scroll bottom is how close to the bottom the scroller is (old and
         //current for different needs)
         oldScrollBottom: (globals.discussionScrollHeight - globals.discussionClientHeight - 
                        globals.discussionScrollTop),
         currentScrollBottom: (discussions.scrollHeight - discussions.clientHeight - 
                        discussions.scrollTop),
         oldScrollHeight : globals.discussionScrollHeight,
         oldScrollTop : globals.discussionScrollTop,
         oldClientHeight : globals.discussionClientHeight,
         oldClientWidth : globals.discussionClientWidth,
         currentScrollHeight : discussions.scrollHeight,
         currentScrollTop : discussions.scrollTop,
         currentClientHeight : discussions.clientHeight,
         currentClientWidth : discussions.clientWidth
      };

      //NOTE: USE BASEDATA WHENEVER POSSIBLE IN THIS SECTION

      //The actual discussion CONTAINER (the square on screen, not the list
      //with messages) changed sizes, maybe due to the sidebar opening / etc.
      //These resizes override other types of resizes... or should they?
      if(Math.floor(baseData.currentClientHeight) !== Math.floor(baseData.oldClientHeight) ||
         Math.floor(baseData.currentClientWidth) !== Math.floor(baseData.oldClientWidth))
      {
         //Instant jump, interrupt smooth scroll
         if(baseData.oldScrollBottom < getLocalOption("discussionresizelock")) 
         {
            if(!isSmoothScrollInterrupted())
               log.Drawlog("Smooth scroll INTERRUPTED by instant jump due to overall discussion resize: " +
                  "oldClientHeight: " + baseData.oldClientHeight + ", current: " + baseData.currentClientHeight);
            interruptSmoothScroll();
            scrollBottom(discussions);
         }

         signals.Add("discussionresize", baseData);
      }
      //This should be activated on ANY inner discussion resize (so like images
      //loading or messages getting added, etc)
      else if(Math.floor(baseData.oldScrollHeight) !== Math.floor(baseData.currentScrollHeight))
      {
         //Begin nice scroll to bottom
         if(shouldAutoScroll(baseData))
         {
            log.Drawlog("Smooth scrolling now, all data: " + JSON.stringify(baseData));
            if(baseData.currentScrollBottom <= 0)
            {
               log.Warn("ScrollTop snapped to bottom without our input (is this a browser bug?), forcing " +
                  "scroll anyway by manipulating baseData");
               baseData.currentScrollTop = baseData.oldScrollTop;
               baseData.currentScrollBottom = baseData.currentScrollHeight - baseData.oldScrollHeight;
            }
            globals.smoothScrollNow = baseData.currentScrollTop; //discussions.scrollTop;
         }
         else
         {
            log.Warn("Not smooth scrolling on resize (not at bottom): " + JSON.stringify(baseData));
         }

         signals.Add("discussionscrollresize", baseData);
      }
      //We only detect scrolling up/down when the discussion hasn't changed sizes, is this acceptable?
      else if(baseData.scrollDiff < 0) //ONLY scrolldiff if there's not a change in scroll height
      {
         signals.Add("discussionscrollup", baseData);
      }

      //This is the smooth scroller!
      if(!isSmoothScrollInterrupted())
      {
         if(Math.abs(baseData.currentScrollTop - globals.smoothScrollNow) <= 1)
         {
            //We will go at MINIMUM half framerate (to prevent huge stops from
            //destroying the animation)
            var cdelta = Math.min(32, delta);
            var scm = Math.max(1, cdelta * 60 / 1000 * 
               getLocalOption("discussionscrollspeed") * Math.abs(baseData.currentScrollBottom));
            log.Drawlog("btmdistance: " + baseData.currentScrollBottom + ", scm: " + scm + ", delta: " 
               + cdelta + ", apparentscrolltop: " + baseData.currentScrollTop); //discussions.scrollTop);
            //These are added separately because eventually, our scrolltop will move
            //past the actual assigned one
            globals.smoothScrollNow = Math.ceil(globals.smoothScrollNow + scm);
            writeDom(() => discussions.scrollTop = globals.smoothScrollNow);
         }
         else
         {
            interruptSmoothScroll();
            log.Drawlog("Smooth scroll interrupted at " + baseData.scrollDiff + " from bottom")
         }
      }

      globals.discussionClientHeight = discussions.clientHeight;
      globals.discussionClientWidth = discussions.clientWidth;
      globals.discussionScrollHeight = discussions.scrollHeight;
      globals.discussionScrollTop = discussions.scrollTop;

      signalProcess(time);
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
   signals.Attach("localsettingupdate_event", data => setLocalOption(data.key, data.value));
   
   signals.Attach("setlocaloption", data => writeDom(() => handleSetting(data.key, data.value)));
   signals.Attach("clearlocaloption", data => writeDom(() => handleSetting(data.key, data.value)));
   signals.Attach("setloginstate", state =>
   {
      if(state)
         document.querySelectorAll('#rightpanenav a')[getLocalOption("initialtab")].click();
   });

   signals.Attach("spastart", parsed => 
   {
      if((rightpane.clientWidth / window.innerWidth) > getLocalOption("autohidesidebar"))
         writeDom(() => hide(rightpane));
      quickLoad(parsed);
   });

   signals.Attach("setcontentmode", type =>
   {
      if(!isPageLoading())
         setRememberedFormat(getActiveDiscussionId(), type);
   });

   //These are so small I don't care about them being directly in here
   var apiSetLoading = (data, load) => 
   {
      if(!data.endpoint.endsWith("listen"))
         writeDom(() => { if(load) addLoading(); else removeLoading(); });
   };

   signals.Attach("apinetworkerror", apidat =>
   {
      log.Error("Network error occurred in API; this message is for tracking purposes");
   });
   signals.Attach("apierror", data => 
   {
      if(!data.abortNow && !data.networkError)
      {
         //TODO: This eventually needs to tell you HOW LONG you're banned and
         //who banned you. Make it return json you can parse from responseText
         if(data.request.status == 418)
         {
            notifyError("You're temporarily banned: '" + data.request.responseText + "'");
         }
         else if(data.request.status == 429 && data.endpoint === "read/listen")
         {
            if(getLocalOption("toastrequestoverload"))
               notifyError("Long poll: Too many requests from your IP (429)");
            else
               log.Warn("Long poll overload: " + globals.api.FormatData(data));
         }
         else
         {
            notifyError("API Error: " + globals.api.FormatData(data));
         }
      }
   });
   signals.Attach("apistart", data =>
   {
      apiSetLoading(data, true);
      if(!(data.endpoint === "read/listen" && !getLocalOption("loglongpollreq")))
         log.Apilog("[" + data.rid + "] " + data.method +  ": " + data.url);
   });
   signals.Attach("apiend", data =>
   {
      apiSetLoading(data, false);
      log.Apilog(globals.api.FormatData(data) + " (" + data.request.response.length + "b)");
   });

   signals.Attach("longpollstart", data => writeDom(() => setConnectionState("connected")));
   //signals.Attach("longpollcomplete", handleLongpollData); 
   signals.Attach("longpollabort", data => writeDom(() => setConnectionState("aborted")));
   signals.Attach("longpollerror", data => 
   {
      log.Error("Can't connect to live updates: " + data.request.status + " - " + data.request.statusText);
      writeDom(() =>setConnectionState("error"));
   });
   signals.Attach("longpollalways", data => { globals.lastsystemid = data.lpdata.lastId });
   signals.Attach("longpollfatal", data =>
   {
      writeDom(() => setConnectionState("error"));
      UIkit.modal.confirm("Live updates recover from error. " +
         "This can happen when the page gets unloaded for a long time, and is normal. " +
         "Press OK to reload page.\n\nIf you " +
         "CANCEL, the website will not function properly!").then(x =>
      {
         location.reload();
      });
   });

   //You MUST be able to assume that discussions and all that junk are fine at
   //this point.
   signals.Attach("routecomplete", data =>
   {
      //Don't worry about long polling at all if you're not logged in
      if(getToken())
      {
         var statuses = { "-1" : "online" };
         var cid = getActiveDiscussionId();
         if(cid) statuses[cid] = "online";
         tryUpdateLongPoll(statuses);
      }
   });

   signals.Attach("formatdiscussions", data =>
   {
      if(data.hasDiscussion)
      {
         log.Drawlog("Format discussions, scrolling to bottom now: " + JSON.stringify(data));
         interruptSmoothScroll();
         scrollBottom(discussions);
      }
   });

   signals.Attach("discussionscrollup", data =>
   {
      //if(!isSmoothScrollInterrupted())
      //Don't let smooth scrolling perform a load of comments etc.
      if(data.currentScrollTop !== 0 && isSmoothScrollInterrupted() && 
         getLocalOption("loadcommentonscroll") && data.currentScrollTop <
         getLocalOption("scrolldiscloadheight") * data.currentClientHeight &&
         !shouldAutoScroll(data))
      {
         loadOlderCommentsActive();
      }
   });

   signals.Attach("hidediscussion", d =>
   {
      var dsc = d.discussion;
      var messages = dsc.querySelectorAll('[data-messageframe]:not([data-uid="0"])');
      var remove = messages.length - getLocalOption("bgdiscussionmsgkeep");
      if(remove > 0)
      {
         log.Info("Removing " + remove + " messages from background discussion " + dsc.id);
         for(var i = 0; i < remove; i++)
            Utilities.RemoveElement(messages[i]);
         dsc.removeAttribute(attr.atoldest);
      }
   });
}

//TODO: TEMPORARY LOCATION
function interruptSmoothScroll()
{
   globals.smoothScrollNow = Number.MIN_SAFE_INTEGER;
}

function isSmoothScrollInterrupted()
{
   return globals.smoothScrollNow === Number.MIN_SAFE_INTEGER;
}

function shouldAutoScroll(baseData)
{
   return baseData.oldScrollBottom < baseData.oldClientHeight * getLocalOption("discussionscrolllock") ||
      baseData.currentScrollBottom < baseData.currentClientHeight * getLocalOption("discussionscrolllock");
}

function scrollBottom(element)
{
   writeDom(() => Utilities.ScrollToBottom(discussions));
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
         pageerror("SPA process", "Couldn't find loader for page " + spadata.page);
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
      globals.api.Get("test/info", "", (data) =>
      {
         log.Debug("Received technical info from API");

         writeDom(() =>
         {
            multiSwap(technicalinfo, {
               apiroot: apiroot,
               apiversion: data.data.versions.contentapi,
               entitysystemversion: data.data.versions.entitysystem
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
   movedownmode.onclick = makeSet(increaseMode);
   moveupmode.onclick = makeSet(decreaseMode);

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
      if(getLocalOption("generaltoast"))
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
      globals.api.Post("user/register/sendemail", 
         {"email" : formSerialize(registerform)["email"] },
         data => log.Info("Registration email sent! Check your email"), 
         data => notifyError("There was a problem sending your email. However, your registration was submitted successfully."));
      writeDom(() => registrationstep2.click());
   }, formData =>
   {
      if(formData.password != formData.password2)
         return "Passwords don't match!"
      return undefined;
   });

   formSetupSubmit(registerconfirmform, "user/register/confirm", token =>
   {
      if(getLocalOption("generaltoast"))
         notifySuccess("Registration complete!");
      login(token);
   });
   formSetupSubmit(registerresendform, "user/register/sendemail", token =>
   {
      if(getLocalOption("generaltoast"))
         notifySuccess("Email re-sent!");
   });

   userchangeavatar.addEventListener("click", function() {
      globals.fileselectcallback = id => 
         globals.api.Put("user/basic", {avatar:id}, data => updateCurrentUserData(data.data));
   });

   userinvalidatesessions.addEventListener("click", function(e)
   {
      e.preventDefault();

      UIkit.modal.confirm("This will force ALL sessions EVERYWHERE to be invalid, " + 
         "you will need to log back in to ALL devices. This is useful if you believe " +
         "someone has stolen your session token. Are you SURE you want to do this?").then(function()
      {
         globals.api.Post("user/invalidatealltokens", "pleaseinvalidate", data => logout());
      }, () => log.Debug("Cancelled invalidate tokens"));
   });

   restoredefaultsettings.onclick = (e) => 
   {
      e.preventDefault();

      UIkit.modal.confirm("You will lose all your current device settings, are you " +
         "sure you want to reset to default?").then(function()
      {
         for(key in options)
            clearLocalOption(key);
         refreshOptions();
      }, () => log.Debug("Cancelled invalidate tokens"));
   };

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
         globals.fileselectcallback(getSwap(selectedImage, "fileid")); 
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
      progress: generalProgress,
      loadEnd: generalProgress,
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

   fileupload.addEventListener('paste', function(event) {
      var data = event.clipboardData;
      if (data && data.files) {
         var file = data.files[0];
         if (file && (/^image\//).test(file.type))
         {
            fileuploadform.__uikit__.upload.upload([file]);
         }
      }
   });

   log.Debug("Setup all file uploading/handling");
}

function sendDiscussionMessage(message, markup, error)
{
   var currentDiscussion = getActiveDiscussionId();
   var sendData = {
      "parentId" : Number(currentDiscussion),
      "content" : createComment(message, markup)
   };

   globals.api.Post("comment", sendData, undefined, error );
   signals.Add("sendcommentstart", sendData);
}

//Right now, this can only be called once :/
function setupDiscussions()
{
   postdiscussiontext.onkeypress = function(e) 
   {
		if (!e.shiftKey && e.keyCode == 13)
      {
			e.preventDefault();

         var currentText = postdiscussiontext.value;
         if(!currentText)
            return;
         sendDiscussionMessage(currentText, getLocalOption("defaultmarkup"), error =>
         {
            postdiscussiontext.value = currentText;
         });

         postdiscussiontext.value = "";
		}
	};

   discussionimageselect.addEventListener("click", function() {
      globals.fileselectcallback = function(id) { //TODO: this assumes 12y format
         if(postdiscussiontext.value && !postdiscussiontext.value.endsWith(" "))
            postdiscussiontext.value += " ";
         postdiscussiontext.value += "!" + getComputedImageLink(id);
      };
   });

   log.Debug("Setup discussions (scrolling/etc)");
}

function setupSearch()
{
   searchform.onsubmit = doSearch;
   searchformicon.onclick = doSearch;
}

//Tied directly to setupSearch I guess
function doSearch(event)
{
   event.preventDefault();
   searchinput.blur();

   var searchops = {
      reverse : searchreverseoption.checked,
      sort: searchsortoption.value,
      value : searchinput.value,
      search : {
         pages : searchpagesoption.checked,
         users : searchusersoption.checked,
         categories : searchcategoriesoption.checked
      }
   };

   //Don't search on empty
   if(!searchops.value)
      return;

   globals.api.Search(searchops, data =>
   {
      log.Datalog("see devlog for search data", data);
      handleSearchResults(data.data);
   });
}



// ***************
// --- ROUTING ---
// ***************

//Data is SPA for all these

//Handle a spa route completion event, assuming all the data was loaded/etc
function route_complete(spadat, title, applyTemplate, breadcrumbs, cid)
{
   //If we are the LAST request, go ahead and finalize the process.
   if(spadat.rid === globals.spa.requestId)
   {
      if(breadcrumbs)
         breadcrumbs.forEach(x => x.link = x.link || (x.content ? getPageLink(x.id) : getCategoryLink(x.id)));

      writeDom(() =>
      {
         renderPage(spadat.route, applyTemplate, breadcrumbs);
         setTitle(title);
         if(!cid)
            hideDiscussion();
         globals.spahistory.push(spadat);

         signals.Add("routecomplete", { spa : spadat });
      });
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
            message : message,
            title : title 
         });
      }));

      signals.Add("pageerror", {title: title, message: message});
   });
}

function routehome_load(spadat) 
{ 
   route_complete(spadat, null, templ =>
   {
      finalizeTemplate(templ);
      //Eventually merge these two together!!!
      var slideshow = templ.querySelector("[data-slideshowitems]");
      var params = new URLSearchParams();
      params.append("requests", "content-" + JSON.stringify({
         "type" : "program",
         "associatedkey" : "photos",
         "associatedvalue" : "_%",
         "sort" : "random",
         "limit": getLocalOption("frontpageslideshownum")
      }));
      params.set("content", "id,name,type,parentId,createDate,editDate,createUserId,values");
      globals.api.Chain(params, apidata =>
      {
         log.Datalog("see devlog for frontpage data", apidata);
         var data = apidata.data;
         data.content.forEach(x =>
         {
            slideshow.appendChild(makeAnnotatedSlideshowItem(x));
         });
      });
      var homehistory = templ.querySelector("[data-homehistory]");
      homehistory.appendChild(makeActivity());
   }); 
}

function routetest_load(spadat) 
{ 
   route_complete(spadat, null, templ =>
   {
      templ.appendChild(makeUserSearch(x => { console.log("Selected: ", x);}));
   }); 
}

function routeadmin_load(spadat) 
{ 
   route_complete(spadat, null, templ =>
   {
      var userselects = templ.querySelectorAll('[data-userselect]');
      [...userselects].forEach(x => x.appendChild(makeUserCollection(x.getAttribute("name"), false, 1)));

      var banform = templ.querySelector('[data-banform]');
      formSetupSubmit(banform, "ban", bandat =>
      {
         notifySuccess("Banned user: " + bandat.bannedUserId);
      }, fd =>
      {
         fd.bannedUserId = fd.bannedUserId[0];
         var now = new Date();
         now.setTime(now.getTime() + Number(fd.expireDate) * 60 * 60 * 1000);
         fd.expireDate = now.toISOString();
      });

      var lastBanId = Math.pow(2, 40); //arbitrary lol
      var banhistory = templ.querySelector('[data-banhistory]');
      var loadbans = templ.querySelector("[data-loadmorebans]");

      loadbans.onclick = () =>
      {
         var params = new URLSearchParams();
         params.append("requests", "ban-" + JSON.stringify({ 
            "maxId" : lastBanId,
            "reverse" : true 
         }));
         params.append("requests", "user.0createUserId.0bannedUserId");
         globals.api.Chain(params, apidat =>
         {
            var data = apidat.data;
            var users = idMap(data.user);
            lastBanId = Math.min(...data.ban.map(x => x.id));
            data.ban.forEach(x =>
            {
               var bnt = cloneTemplate("banhistoryitem");
               var duration = Utilities.TimeDiff(x.expireDate, x.createDate, true, undefined, 1);
               if(duration.toLowerCase().indexOf("now") >= 0)
                  duration = "instant";
               multiSwap(bnt, {
                  admin : users[x.createUserId].username,
                  adminlink : getUserLink(x.createUserId),
                  banned : users[x.bannedUserId].username,
                  bannedlink : getUserLink(x.bannedUserId),
                  type : x.type,
                  message : x.message,
                  duration : duration,
                  date : x.createDate
               });
               finalizeTemplate(bnt);
               banhistory.appendChild(bnt);
            });

            if(data.ban.length != 1000)
               hide(loadbans);
         });
      };
   }); 
}

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
   params.append("requests", "category-" + JSON.stringify({"ComputeExtras":true}));
   //Need to make a SECOND content request
   params.append("requests", "content.1values_pinned-" + JSON.stringify({"parentIds":[cid]}));
   params.append("requests", "user.0createUserId.0edituserId.1createUserId.2createUserId");
   params.set("content", "id,name,type,parentId,createDate,editDate,createUserId,values,permissions");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see devlog for category data", apidata);

      var data = apidata.data;
      var users = idMap(data.user);
      var categories = idMap(data.category);
      categories[0] = Utilities.ShallowCopy(rootCategory);
      var c = categories[cid]; //{ "name" : "Website Root", "id" : 0 };

      if(!c)
      {
         pageerror("NOT FOUND", "Couldn't find category " + cid);
         return
      }

      route_complete(spadat, "Category: " + c.name, templ =>
      {
         //Some of these attributes GO AWAY as soon as you access them with
         //getSwap/multiSwap, BE CAREFUL
         var sbelm = templ.querySelector("[data-subcats]");
         var pgelm = templ.querySelector("[data-pages]");
         var description = templ.querySelector("[data-description]");
         var childcats = data.category.filter(x => x.parentId === cid);

         if(cid == 0)
            c.myPerms = "C";

         multiSwap(templ, { 
            title : c.name ,
            permissions : c.myPerms,
            editlink : "?p=categoryedit-" + cid,
            newlink : "?p=categoryedit&pid=" + cid,
            newpagelink : "?p=pageedit&pid=" + cid,
            deleteaction : (e) =>
            {
               if(confirm("Are you SURE you want to delete this category?"))
               {
                  globals.api.Delete("category", cid, () => location.href = getCategoryLink(c.parentId));
               }
            },
            description : c.description
         });

         templ.querySelector("[data-viewraw]").onclick = e =>
         {
            e.preventDefault();
            displayRaw(c.name, JSON.stringify(c, null, 2));
         };

         var pinCount = DataFormat.MarkPinned(c, data.content, true);
         log.Debug("Found " + pinCount + " pinned pages");

         //TODO: use the API to remove userpages!
         data.content = data.content.filter(x => x.type != "userpage");

         if(!childcats.length)
            hide(sbelm);
         if(!c.description)
            hide(description);
         if(data.content.length)
            hide(pgelm.querySelector("[data-nopages]"));

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
   params.set("category", "id,name,parentId,values");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see dev log for page data", apidata);

      var data = apidata.data;
      var c = data.content[0];

      if(!c)
      {
         pageerror("NOT FOUND", "Couldn't find page " + pid);
         return
      }

      var users = idMap(data.user);
      var categories = idMap(data.category);
      DataFormat.MarkPinned(categories[c.parentId], [c]);

      route_complete(spadat, c.name, templ =>
      {
         finishContent(templ, c, categories);
         maincontentinfo.appendChild(makeStandardContentInfo(c, users));
         finishDiscussion(c, data.comment, users, initload);
      }, getChain(data.category, c), c.id);
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
      "type" : "userpage",
      "includeAbout" : true,
      "limit" : 1
   }));
   params.append("requests", "comment.1id$ParentIds-" + JSON.stringify({
      "Reverse" : true,
      "Limit" : initload
   }));
   params.append("requests", "user.1createUserId.1edituserId.2createUserId");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see dev log for user data", apidata);

      var data = apidata.data;
      var users = idMap(data.user);
      var u = users[uid];
      var c = data.content[0];

      if(!u)
      {
         pageerror("NOT FOUND", "Couldn't find user " + uid);
         return;
      }

      u.name = u.username;
      u.link = getUserLink(u.id);

      route_complete(spadat, "User: " + u.username, templ =>
      {
         multiSwap(templ, {
            title : u.username,
            banned : u.banned,
            avatar : getAvatarLink(u.avatar, 100)
         });

         var history = templ.querySelector("[data-userhistory]");
         history.appendChild(makeActivity(s =>
         {
            s.userIds = [uid];
            return s;
         }));

         if(c)
         {
            c.name = u.username;
            finishContent(templ, c);
            maincontentinfo.appendChild(makeStandardContentInfo(c, users));
            finishDiscussion(c, data.comment, users, initload);
         }
         else
         {
            //Find the first "content" and fill it with something custom,
            //PLEASE BE CAREFUL
            multiSwap(templ, { 
               directcontent : 'No user page' + 
                  (getUserId() === u.id ?  ', <a href="?p=pageedit&type=userpage">Create one</a>' : "")
            });
         }
      }, [u], c ? c.id : false);
   });
}

function routecategoryedit_load(spadat)
{
   var cid = Number(spadat.id);
   var params = new URLSearchParams();

   //Just ALWAYS pull all the categories, it's just a given
   params.append("requests", "category");

   //But pull special category data when we're editing (the user permissions)
   if(cid)
   {
      params.append("requests", "user.0permissions.0localsupers");
   }

   params.set("user", "id,username,avatar");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see devlog for categoryedit data", apidata);

      var data = apidata.data;
      var users = idMap(data.user);
      users[0] = Utilities.ShallowCopy(everyoneUser);
      var categories = idMap(data.category);

      var title = "Category: " + (cid ? cid : "New");
      var baseData = false;
      var newPid = Utilities.GetParams(spadat.url).get("pid");

      if(cid && categories[cid])
         baseData = categories[cid];

      route_complete(spadat, title, templ =>
      {
         multiSwap(templ, { 
            title : title
         });
         var cselect = templ.querySelector('[data-categoryselect]');
         cselect.appendChild(makeCategorySelect(data.category, cselect.getAttribute("name"), true));

         var lsupers = templ.querySelector('[data-localsupers]');
         lsupers.appendChild(makeUserCollection(lsupers.getAttribute("name")));

         var perms = templ.querySelector('[data-permissions]');
         perms.appendChild(makeUserCollection(perms.getAttribute("name"), true));

         if(baseData)
         {
            formFill(templ, baseData);

            baseData.localSupers.forEach(x => {
               if(users[x]) addPermissionUser(users[x],lsupers); });
            Object.keys(baseData.permissions).forEach(x => 
            {
               if(users[x]) addPermissionUser(users[x],perms, baseData.permissions[x]);
            });
         }
         else
         {
            addPermissionUser(users[0],perms, getLocalOption("defaultpermissions"));

            if(newPid !== null)
               formFill(templ, { "parentId": newPid });
         }


         formSetupSubmit(templ.querySelector("form"), "category", c =>
         {
            globals.spa.ProcessLinkContextAware(getCategoryLink(c.id));
         }, false, baseData);
      }, baseData ? getChain(data.category, baseData) : undefined);
   });
}

function routepageedit_load(spadat)
{
   var pid = Number(spadat.id);
   var params = new URLSearchParams();

   //Just ALWAYS pull all the categories, it's just a given
   params.append("requests", "category");

   //But pull special page data when we're editing (the user permissions)
   if(pid)
   {
      params.append("requests", "content-" + JSON.stringify({ids:[pid]}));
      params.append("requests", "user.1permissions.1createuserid.1edituserid");
   }

   params.set("user", "id,username,avatar");
   params.set("category", "id,name,parentId");

   globals.api.Chain(params, function(apidata)
   {
      log.Datalog("see devlog for pageedit data", apidata);

      var data = apidata.data;
      var users = idMap(data.user);
      users[0] = Utilities.ShallowCopy(everyoneUser);
      var categories = idMap(data.category);
      var content = idMap(data.content);

      var title = "Page: " + (pid ? pid : "New");
      var baseData = false;
      var newPid = Utilities.GetParams(spadat.url).get("pid");
      var newType = Utilities.GetParams(spadat.url).get("type");

      if(pid && content[pid])
         baseData = content[pid];

      route_complete(spadat, title, templ =>
      {
         //Need to pull in the widgets, hope it's ok
         finalizeTemplate(templ);

         multiSwap(templ, { 
            title : title
         });
         var cselect = templ.querySelector('[data-categoryselect]');
         cselect.appendChild(makeCategorySelect(data.category, cselect.getAttribute("name"), true));

         var perms = templ.querySelector('[data-permissions]');
         perms.appendChild(makeUserCollection(perms.getAttribute("name"), true));

         var imgselect = templ.querySelector('[data-imageselect]');
         imgselect.appendChild(makeImageCollection(imgselect.getAttribute("name")));

         var cntimage = templ.querySelector('[data-contentimage]');
         cntimage.addEventListener("click", e => 
         {
            e.preventDefault();
            globals.fileselectcallback = id => 
            {
               var cnttxt = cntimage.previousElementSibling;
               Utilities.InsertAtCursor(cnttxt, getComputedImageLink(id));
            };
         });

         var refreshForm = (c) =>
         {
            c = c || formSerialize(templ, baseData);
            var isUserpage = c.type === "userpage";
            setHidden(templ.querySelector("[data-pagetype]"), isUserpage);
            setHidden(templ.querySelector("[data-pagename]"), isUserpage);
            setHidden(templ.querySelector("[data-pagecategory]"), isUserpage);

            var isProgram = c.type === "program";
            setHidden(templ.querySelector("[data-pageimages]"), !isProgram);
            setHidden(templ.querySelector("[data-pagekey]"), !isProgram);

            if(isUserpage)
            {
               formFill(templ, {"name" : getUsername() + "'s userpage"});
               findSwap(templ, "title", getUsername() + ": Userpage");
            }
            else
            {
               findSwap(templ, "title", title);
            }
         };

         var imgthm = templ.querySelector("[data-thumbnail]");
         var rmvthm = templ.querySelector("[data-thumbnailremove]");
         var slcthm = templ.querySelector("[data-thumbnailselect]");

         var setThumbnail = (id) =>
         {
            imgthm.setAttribute("data-value", id);
            imgthm.src = getComputedImageLink(id, 200);
            unhide(rmvthm);
            hide(slcthm);
         };

         rmvthm.onclick = (e) =>
         {
            e.preventDefault();
            imgthm.setAttribute("data-value", "");
            imgthm.src = "";
            unhide(slcthm);
            hide(rmvthm);
         };

         slcthm.addEventListener('click', (e) =>
         {
            e.preventDefault();
            globals.fileselectcallback = setThumbnail;
         });

         templ.querySelector('[data-preview]').onclick = (e) =>
         {
            e.preventDefault();
            var form = formSerialize(templ, baseData);
            displayPreview(form.name, form.content, form.values.markupLang);
         };

         templ.querySelector('[name="type"]').oninput = (e) => refreshForm();

         if(baseData)
         {
            formFill(templ, baseData);

            Object.keys(baseData.permissions).forEach(x => {
               if(users[x]) addPermissionUser(users[x],perms, baseData.permissions[x]);
            });

            (baseData.values.photos || "").split(",").filter(x => x).forEach(x => addImageItem(x, imgselect));

            var thm = Number(baseData.values.thumbnail);
            if(thm) setThumbnail(thm);

            refreshForm();
         }
         else
         {
            addPermissionUser(users[0],perms, getLocalOption("defaultpermissions"));
            var newfill = {};

            if(newPid !== null)
               newfill.parentId = newPid;
            if(newType !== null)
               newfill.type = newType;

            formFill(templ, newfill);
            refreshForm();
         }

         formSetupSubmit(templ.querySelector("form"), "content", p =>
         {
            if(p.type === "userpage")
               globals.spa.ProcessLinkContextAware(getUserLink(p.createUserId));
            else
               globals.spa.ProcessLinkContextAware(getPageLink(p.id));
         }, false, baseData);
      }, baseData ? getChain(data.category, baseData) : undefined);
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
      setExpandableTextbox(value);
   }
   if(key === "theme")
   {
      setTheme(value);
   }
   if(key === "displaynotifications" && value)
   {
      var undosetting = () =>
      {
         setLocalOption("displaynotifications", false);
         refreshOptions();
         notifyError("No permission to display notifications, setting forced 'off'");
      };

      if(Notification.requestPermission)
      {
         Notification.requestPermission().then(permission =>
         {
            if(permission !== "granted")
               undosetting();
         });
      }
      else
      {
         undosetting();
      }
   }
}

function handleSearchResults(data)
{
   hide(searchpagesresults);
   hide(searchusersresults);
   hide(searchcategoriesresults);

   var total = 0;
   data.content = data.content || [];
   data.user = data.user || [];
   data.category = data.category || [];

   total = data.content.length + data.user.length + data.category.length;

   displaySearchResults(searchpagesresults, mapSearchContent(data.content));
   displaySearchResults(searchusersresults, mapSearchUser(data.user));
   displaySearchResults(searchcategoriesresults, mapSearchCategories(data.category));

   setHidden(nosearchresults, total);
}

function quickLoad(spadat)
{
   if(getLocalOption("quickload"))
   {
      writeDom(() =>
      {
         log.Debug("Quick loading page, assuming format before we have all the data");

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
            formatRememberedDiscussion(spadat.id, true); //last doesn't matter, default to whatever
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

   //Api.prototype.Generic = function(suburl, success, error, always, method, data, modify)
   globals.api.Generic(url, apidata =>
   {
      var files = apidata.data;
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
   }, undefined, undefined, "GET");
}

function addFileUploadImage(file, num)
{
   var fItem = cloneTemplate("fupmain");
   var fThumb = cloneTemplate("fupthumb");
   multiSwap(fItem, { 
      imgsrc: getComputedImageLink(file.id) 
   });
   multiSwap(fThumb, {
      imgsrc: getComputedImageLink(file.id, 60, true),
      number: num,
      fileid: file.id
   });
   fileuploaditems.appendChild(fItem);
   fileuploadthumbnails.appendChild(fThumb);
}

function updateCurrentUserData(user)
{
   writeDom(() =>
   {
      //Just username and avatar for now?
      website.setAttribute("data-issuper", user.super);
      navuseravatar.src = getAvatarLink(user.avatar, 40);
      userusername.firstElementChild.textContent = user.username;
      userusername.setAttribute("data-username", user.username);
      userusername.href = getUserLink(user.id);
      userid.textContent = "User ID: " + user.id;
      userid.setAttribute("data-userid", user.id);  //Can't use findSwap: it's an UPDATE
      finalizeTemplate(userusername); //be careful with this!
      //Check fields in user for certain special fields like email etc.
      signals.Add("updatecurrentuser", user);
   });
}

//function formatRememberedDiscussion(spadat, type)//cid, type)
//{
//   var hasDiscussion = typeHasDiscussion(spadat.page) && spadat.page !== "user";
//
//   if(hasDiscussion)
//      showDiscussion(Number(spadat.id));
//   else
//      hideDiscussion();
//
//}

function formatRememberedDiscussion(cid, show, type)
{
   var fmt = "content"; //What are we doing with split mode?

   if(type==="chat")
      fmt = "discussion";
   // if(type==="documentation" || type==="program" || type==="tutorial"
   //    || type ==="resource")
   //    fmt = "content";

   formatDiscussions(show, getRememberedFormat(cid) || fmt);
}

function finishDiscussion(content, comments, users, initload)
{
   var d = getDiscussion(content.id);
   if(initload && (comments.length !== initload))
      d.setAttribute(attr.atoldest, "");
   showDiscussion(content.id);
   easyComments(comments, users);
   formatRememberedDiscussion(content.id, true, content.type);

   signals.Add("finishdiscussion", { content: content, comments: comments, users: users, initload: initload});
}

function finishContent(templ, content) //, content, comments, users, initload)
{
   //Need to finish the template now, hopefully running it twice isn't a big deal
   finalizeTemplate(templ);
   if(content.type === "program" && content.values.photos)
   {
      //var photos = content.values.photos.split(",").filter(x => x);
      unhide(templ.querySelector("[data-programcontainer]"));
      fillSlideshow(templ.querySelector("[data-slideshowitems]"), content);
      multiSwap(templ, {
         "key" : content.values.key
      });
      //var slideshow = templ.querySelector("[data-slideshowitems]");
   }
   var pagecontrols = templ.querySelector(".pagecontrols");
   unhide(pagecontrols);
   templ.querySelector("[data-viewraw]").onclick = e =>
   {
      e.preventDefault();
      displayRaw(content.name, JSON.stringify(content, null, 2));
   };
   multiSwap(templ, {
      title : content.name,
      content : JSON.stringify({ "content" : content.content, "format" : content.values.markupLang }),
      permissions : content.myPerms,
      pinned: content.pinned,
      format : content.values.markupLang
   });
   //TODO: CAREFUL! This assumes something about the page structure, and that's
   //not the point of the templating system! You should probably tie the
   //functions to the CLOSEST template to the query selected item when doing swap
   multiSwap(pagecontrols, {
      editlink : "?p=pageedit-" + content.id,
      watched : content.about.watching,
      deleteaction : (e) =>
      {
         if(confirm("Are you SURE you want to delete this page?"))
         {
            globals.api.Delete("content", content.id, () => location.href = getCategoryLink(content.parentId));
         }
      },
      pinaction : (e) =>
      {
         //look up the parent as it is now, parse pinned, add page, convert to
         //set, store back
         globals.api.Get("category", "ids=" + content.parentId, apidat =>
         {
            var c = apidat.data[0];
            DataFormat.AddPinned(c, content.id);
            globals.api.Put("category/"+c.id, c, () =>
            {
               globals.spa.ProcessLink(location.href);
            });
         });
      },
      unpinaction : (e) =>
      {
         //look up the parent as it is now, parse pinned, add page, convert to
         //set, store back
         globals.api.Get("category", "ids=" + content.parentId, apidat =>
         {
            var c = apidat.data[0];
            DataFormat.RemovePinned(c, content.id);
            globals.api.Put("category/"+c.id, c, () =>
            {
               globals.spa.ProcessLink(location.href);
            });
         });
      }
   });
   setupWatchLink(templ, content.id);
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

function makeActivity(modifySearch, unlimitedHeight)
{
   modifySearch = modifySearch || (x => x);
   var activity = cloneTemplate("history");
   var activityContainer = activity.querySelector(".historycontainer");
   var loadolder = activity.querySelector("[data-loadolder]");
   var loadloading = activity.querySelector("[data-loading]");
   var loadmore = activity.querySelector("[data-loadmore]");

   var searchAgain = function()
   {
      writeDom(() => unhide(loadloading));

      var initload = getLocalOption("activityload");
      var search = { reverse : true, limit: initload };
      var lastItem = activityContainer.lastElementChild;

      if(lastItem) 
         search.maxid = Number(getSwap(lastItem, "activityid")); //lastItem.getAttribute("data-actid"));

      search = modifySearch(search);

      var params = new URLSearchParams();

      params.append("requests", "activity-" + JSON.stringify(search));
      params.append("requests", "content.0contentId");
      params.append("requests", "category.0contentId");
      params.append("requests", "user.0contentId.0userId.1createUserId");
      params.set("content", "id,name,createUserId,type");
      params.set("category", "id,name");
      params.set("user", "id,username,avatar");

      globals.api.Chain(params, apidata =>
      {
         log.Datalog("check dev log for activity data", apidata);

         var data = apidata.data;
         var users = idMap(data.user);
         var all = idMap(data.content.concat(data.category).concat(data.user));

         writeDom(() =>
         {
            //hide(activity.querySelector(".historyloading"));            
            hide(loadloading);
            setHidden(loadolder, data.activity.length !== initload);

            data.activity.forEach(x =>
            {
               var content = all[x.contentId];
               var title = "???";
               if(!content) 
               {
                  if(x.action === "d")
                     title = x.extra;
                  else
                     return; //Don't show this history item
               }
               else
               {
                  title = content.name || ("User: " + content.username);
               }
               activityContainer.appendChild(makeHistoryItem(users[x.userId], x, title));
            });
         });
      });
   };

   loadmore.onclick = function(event)
   {
      event.preventDefault();
      searchAgain();
   };

   searchAgain();

   return activity;
}

function makeCategorySelect(categories, name, includeRoot)
{
   var container = cloneTemplate("categoryselect");

   var rc = Utilities.ShallowCopy(rootCategory);
   //rc.name = "Root";
   categories.unshift(rc);

   treeify(categories);

   fillTreeSelector(categories, container.querySelector("select"), includeRoot);
   hide(container.querySelector("[data-loading]"));
   //Update the value again since we didn't have options before
   multiSwap(container, {
      value: getSwap(container, "value"),
      name : name
   });

   finalizeTemplate(container);

   return container;
}

function makeMiniSearch(baseSearch, dataMap, onSelect, placeholder)
{
   var s = cloneTemplate("minisearch");
   placeholder = placeholder || "Search";

   findSwap(s, "placeholder", placeholder);
   finalizeTemplate(s);

   var input = s.querySelector("[data-search]");
   var results = s.querySelector("[data-results]");

   input.oninput = function(e)
   {
      let sv = input.value;

      setTimeout(function()
      {
         //Ignore strokes that weren't the last one
         if(sv === input.value)
         {
            if(sv)
            {
               baseSearch.value = sv;
               globals.api.Search(baseSearch, (data) =>
               {
                  displayMiniSearchResults(results, dataMap(data.data), x => onSelect(x));
               });
            }
            else
            {
               displayMiniSearchResults(results, []);
            }
         }
      }, getLocalOption("minisearchtimebuffer"));
   };

   return s;
}

function makeUserSearch(onSelect)
{
   return makeMiniSearch({search:{users:true}}, data => 
      data.user.map(x =>
      ({
         id : x.id,
         imageLink : getAvatarLink(x.avatar, 20),
         name : x.username,
         user : x
      })),
      onSelect, "Search Users");
}

function makeUserCollection(name, showperms, limit) //, container)
{
   var fragment = new DocumentFragment();
   var base = cloneTemplate("collection");
   var addpu = x => 
   {
      var existing = [...base.querySelectorAll("[data-collectionitem]")];

      while(limit && existing.length >= limit)
         Utilities.RemoveElement(existing.pop());

      addPermissionUser(x.user, base, showperms ? getLocalOption("defaultpermissions") : undefined);
   };
   fragment.appendChild(base);
   fragment.appendChild(makeUserSearch(addpu));
   if(showperms)
   {
      base.setAttribute("data-keys", "");
      var addeveryone = cloneTemplate("addeveryone");
      addeveryone.onclick = e =>
      {
         e.preventDefault();
         addpu({user:Utilities.ShallowCopy(everyoneUser)});
      };
      fragment.appendChild(addeveryone);
   }
   multiSwap(base, {
      name : name
   });
   finalizeTemplate(base);
   return fragment;
}

function addPermissionUser(user, list, permissions)
{
   if(!list.hasAttribute("data-collection"))
      list = list.querySelector("[data-collection]");
   var showperms = (permissions !== undefined);
   var permuser = makePermissionUser(
      user.avatar !== null ? getAvatarLink(user.avatar, 50) : null, user.username, 
      permissions, user.id === 0);
   list.appendChild(makeCollectionItem(permuser,
      x => showperms ? getSwap(x, "value") : user.id, 
      showperms ? String(user.id) : undefined));
}

function makeImageCollection(name)
{
   var fragment = new DocumentFragment();
   var base = cloneTemplate("collection");
   var select = cloneTemplate("imageselect");
   multiSwap(select, {
      action : () => { globals.fileselectcallback = id => addImageItem(id, base) }
   });
   multiSwap(base, {
      name : name
   });
   base.setAttribute('data-condense', "true");
   finalizeTemplate(base);
   finalizeTemplate(select);
   //var addimg = x => addImageItem(x.user, base, 
   //   showperms ? getLocalOption("defaultpermissions") : undefined);
   fragment.appendChild(base);
   fragment.appendChild(select);
   return fragment;
}

function addImageItem(id, list)
{
   if(!list.hasAttribute("data-collection"))
      list = list.querySelector("[data-collection]");
   var img = cloneTemplate("imageitem");
   multiSwap(img, {
      src : getComputedImageLink(id, 200),
      id : id
   });
   finalizeTemplate(img);
   list.appendChild(makeCollectionItem(img, x => id, undefined, true));
}

function makeAnnotatedSlideshowItem(content)
{
   var tmp = cloneTemplate("annotatedslideshowitem");
   multiSwap(tmp, {
      link: getPageLink(content.id),
      title: content.name,
      tagline: content.values.tagline,
      src: getContentImageLink(content)
   });
   finalizeTemplate(tmp);
   return tmp;
}

function fillSlideshow(slideshow, content)
{
   content.values.photos.split(",").filter(x => x).forEach(x =>
   {
      var tmp = cloneTemplate("slideshowitem");
      multiSwap(tmp, {
         src: getComputedImageLink(x)
      });
      finalizeTemplate(tmp);
      slideshow.appendChild(tmp);
   });
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

function displayRaw(title, raw)
{
   rawmodaltitle.textContent = title;
   rawmodalraw.textContent = raw;
   UIkit.modal(rawmodal).show();
}

function displayPreview(title, rawcontent, format)
{
   previewmodaltitle.textContent = title;
   previewmodalpreview.innerHTML = "";
   previewmodalpreview.appendChild(Parse.parseLang(rawcontent, format));
   UIkit.modal(previewmodal).show();
}

function handleAlerts(comments, users)
{
   //Figure out the comment that will go in the header
   if(!comments)
      return;
   
   var tdo = getLocalOption("titlenotifications");
   var ndo = Notification.permission === "granted" && getLocalOption("displaynotifications");

   if(ndo || tdo)
   {
      var alertids = getWatchLastIds();
      var activedisc = getActiveDiscussionId();

      //Add our current room ONLY if it's invisible (and we're in ndo)
      if(!document.hidden && ndo) //Document is visible, NEVER alert the current room
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
            if(ndo)
            {
               var pw = document.getElementById(getPulseId(x.parentId));
               var name = getSwap(pw, "pwname");
               var notification = new Notification(users[x.createUserId].username + ": " + name, {
                  tag : "comment" + x.id,
                  body : parseComment(x.content).t,
                  icon : getAvatarLink(users[x.createUserId].avatar, 100),
               });
            }
            if(tdo)
            {
               document.head.querySelector("link[data-favicon]").href = getAvatarLink(
                  users[x.createUserId].avatar, 40);
               document.title = parseComment(x.content).t; //.substr(0, 100);
            }
         });
      }
      catch(ex)
      {
         log.Error("Could not send notification: " + ex);
      }
   }
}

function handleLongpollData(lpdata)
{
   var data = lpdata.data;

   if(data)
   {
      var users = idMap(data.chains.user);
      var watchlastids = getWatchLastIds();
      writeDom(() => updatePulse(data.chains));

      if(data.chains.comment)
      {
         //I filter out comments from watch updates if we're currently in
         //the room. This should be done automatically somewhere else... mmm
         data.chains.commentaggregate = DataFormat.CommentsToAggregate(
            data.chains.comment.filter(x => x.id > watchlastids[x.parentId]));
         lpdata.clearNotifications.forEach(x => 
            data.chains.commentaggregate.forEach(y => 
            {
               if(y.id == x)
                  y.count = 0;
            })
         );
            //&& lpdata.clearNotifications.indexOf(x.parentId) < 0));
         handleAlerts(data.chains.comment, users);
         writeDom(() => easyComments(data.chains.comment, users));
      }

      if(data.chains.activity)
      {
         data.chains.activityaggregate = DataFormat.ActivityToAggregate(
            data.chains.activity.filter(x => watchlastids[x.contentId] < x.id &&
               lpdata.clearNotifications.indexOf(x.contentId) < 0));
      }

      log.Datalog("see devlog for watchlastids", watchlastids);
      log.Datalog("see devlog for raw chat data", data);

      writeDom(() => 
      {
         updateWatches(data.chains);

         if(data.listeners)
            updateDiscussionUserlist(data.listeners, users);
      });
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

function localOptionKey(key)
{
   return "localsetting_" + key;
}

function getLocalOption(key)
{
   var val = localStorage.getItem(localOptionKey(key));
   if(val === null || val === undefined)
      return options[key].def;
   else
      return JSON.parse(val);
}

function setLocalOption(key, value)
{
   log.Info("Setting " + key + " to " + value);
   localStorage.setItem(localOptionKey(key), JSON.stringify(value));
   signals.Add("setlocaloption", { key : key, value : value });
}

function clearLocalOption(key)
{
   log.Info("Clearing option " + key);
   localStorage.removeItem(localOptionKey(key));
   signals.Add("clearlocaloption", { key : key, value : getLocalOption(key) });
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

function getAvatarLink(id, size, ignoreRatio) 
{ 
   return getComputedImageLink(id, size, true, ignoreRatio); 
}

function getContentThumbnailLink(content, size, crop, ignoreRatio)
{
   return (content.values && content.values.thumbnail) ? 
      getComputedImageLink(content.values.thumbnail, size, crop, ignoreRatio) : null;
}

function getContentImageLink(content, size, crop, ignoreRatio)
{
   var images = (content.values.photos || "").split(",");
   return images[0] ? getComputedImageLink(images[0], size, crop, ignoreRatio) : null;
}

function getRememberedFormat(cid) {
   return localStorage.getItem("halfe-fmt" + cid);
}

function setRememberedFormat(cid, type) {
   localStorage.setItem("halfe-fmt" + cid, type);
}

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

function treeify(categories)
{
   //Ultra inefficient n^2, don't care at all.
   categories.forEach(x =>
   {
      x.children = categories.filter(y => y.parentId === x.id);
   });
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

function isPageLoading()
{
   //This means there is an in-flight request if there are no history items
   //with the final request id that was generated
   return !globals.spahistory.some(x => x.rid === globals.spa.requestId);
}

// ***********************
// ---- TEMPLATE CRAP ----
// ***********************

function makeError(message)
{
   var error = cloneTemplate("error");
   findSwap(error, "message", message);
   return error;
}

function makeSuccess(message)
{
   var success = cloneTemplate("success");
   findSwap(error, "message", message);
   return success;
}

function makeStandardContentInfo(content, users)
{
   var info = cloneTemplate("stdcontentinfo");
   multiSwap(info, {
      createavatar : getAvatarLink(users[content.createUserId].avatar, 20),
      createlink : getUserLink(content.createUserId),
      createdate : (new Date(content.createDate)).toLocaleString()
   });
   finalizeTemplate(info);
   return info;
}

function makeSubcat(category)
{
   var subcat = cloneTemplate("subcat");
   multiSwap(subcat, {
      link: getCategoryLink(category.id),
      name: category.name
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
      link: getPageLink(page.id),
      name: page.name,
      avatar : getAvatarLink(u.avatar, 50, true),
      userlink : getUserLink(page.createUserId),
      pinned : page.pinned,
      time : date
   });
   thumbType(page, citem);
   finalizeTemplate(citem);
   return citem;
}

function makePWUser(user)
{
   var pu = cloneTemplate("pwuser");
   pu.setAttribute("data-pwuser", user.id);
   multiSwap(pu, {
      userlink: getUserLink(user.id)
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
      userid: comment.createUserId,
      userlink: getUserLink(comment.createUserId),
      useravatar: getAvatarLink(u.avatar, getLocalOption("discussionavatarsize")),
      username: u.username,
      frametime: (new Date(comment.createDate)).toLocaleString()
   });
   finalizeTemplate(frame);
   return frame;
}

function makeCommentFragment(comment)//, users)
{
   var fragment = cloneTemplate("singlemessage");
   multiSwap(fragment, {
      messageid: comment.id,
      id: getCommentId(comment.id),
      createdate: (new Date(comment.createDate)).toLocaleString(),
      editdate: (new Date(comment.editDate)).toLocaleString()
   });
   finalizeTemplate(fragment);
   return fragment;
}

function makeHistoryItem(user, activity, title) //users, activity, contents)
{
   var item = cloneTemplate("historyitem");
   user = user || { avatar: 0, username: "???", id: 0 };
   //var content = contents[activity.contentId];
   //var title = content ? content.name : activity.extra;
   var link = "#";
   if(activity.type === "content")
      link = getPageLink(activity.contentId);
   else if(activity.type === "category")
      link = getCategoryLink(activity.contentId); 
   else if(activity.type === "user")
      link = getUserLink(activity.contentId); 
   multiSwap(item, {
      avatar : getAvatarLink(user.avatar, 20),
      username : user.username,
      userlink : getUserLink(user.id),
      action : activitytext[activity.action],
      contentname : title,
      contentlink : link,
      activityid : activity.id,
      time : Utilities.TimeDiff(activity.date, null, true)
   });
   finalizeTemplate(item);
   return item;
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





//Set up the page and perform initial requests for being "logged in"
function setupSession()
{
   //Don't do this special crap until everything is setup, SOME setup may not
   //be required before the user session is started, but it's minimal savings.
   if(getToken())
      log.Info("User token found, trying to continue logged in");
   else
      return;

   //rightpane.style.opacity = 0.2;
   //setLoginState("loggingin");
   //website.setAttribute("data-checkinglogin", "");
   writeDom(() => 
   {
      unhide(rightpaneactivityloading);
      unhide(rightpanewatchesloading);
   });
   //because of current nature of login, we can set the login state to true
   //right now. TODO: fix all this refreshUser and session stuff.
   writeDom(() => setLoginState("true"));
   //Refreshing will set our login state, don't worry about that stuff.
   refreshUserFull(); 
   //() => writeDom(() => hide(rightpaneloading))); //website.removeAttribute("data-checkinglogin"));

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
   params.set("content","id,name,type,values,createUserId,permissions");
   params.set("user","id,username,avatar");
   params.set("watch","id,contentId,lastNotificationId");

   globals.api.Chain(params, function(apidata)
   {
      //log.Datalog(apidata);

      var data = apidata.data;

      data.systemaggregate.forEach(x => 
      {
         if(x.type === "actionMax")
         {
            log.Info("Last system id: " + x.id);
            globals.lastsystemid = x.id;

            if(getLocalOption("forcediscussionoutofdate"))
               globals.lastsystemid -= 2000;

            tryUpdateLongPoll();
         }
      });

      writeDom(() => 
      {
         hide(rightpaneactivityloading);
         hide(rightpanewatchesloading);
      });

      //Fully stock (with reset) the sidepanel
      updatePulse(data, true);
      updateWatches(data, true);
   });
}


function refreshUserFull(always)
{
   //Make an API call to /me to get the latest data.
   globals.api.Get("user/me", "", function(apidata)
   {
      updateCurrentUserData(apidata.data);
      //Don't set up the FULL session, you know? Someone else will do that
      writeDom(() => setLoginState("true"));
   }, function(apidata)
   {
      //Assume any failed user refresh means they're logged out
      log.Error("Couldn't refresh user, deleting cached token");
      logout();
   }, undefined, always);
}

function updateDiscussionUserlist(listeners, users)
{
   var list = listeners ? listeners[getActiveDiscussionId()] : {};

   for(key in list)
   {
      let uid = key;
      var existing = discussionuserlist.querySelector('[data-uid="' + uid + '"]');
      var avatar = getAvatarLink(users[uid].avatar, 40);

      if(!existing)
      {
         existing = cloneTemplate("discussionuser");
         multiSwap(existing, {
            avatar : avatar,
            userlink : getUserLink(uid)
         });
         finalizeTemplate(existing);
         discussionuserlist.appendChild(existing);
      }

      existing.setAttribute("data-uid", uid);
      existing.setAttribute("data-status", list[uid]);
      findSwap(existing, "avatar", avatar);
   }

   [...discussionuserlist.querySelectorAll("[data-uid]")].forEach(x => 
   {
      if(!list[x.getAttribute("data-uid")])
         Utilities.RemoveElement(x);
   });
}

function getUserId() { return Number(userid.dataset.userid); }
function getUsername() { return userusername.dataset.username; }

function formError(form, error)
{
   writeDom(() => form.appendChild(makeError(error)));
   log.Error(error);
}

function formSetupSubmit(form, endpoint, success, validate, baseData)
{
   form.addEventListener("submit", function(event)
   {
      event.preventDefault();
      formStart(form);

      var formData = formSerialize(form, baseData);
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

      var func = globals.api.Post.bind(globals.api);
      //var data = formData;

      if(baseData)
      {
         func = globals.api.Put.bind(globals.api);
         //data = Utilities.MergeInto(baseData, formData);
         endpoint += "/" + baseData.id;
      }

      func(endpoint, formData, apidata => success(apidata.data),
         apidata => formError(form, apidata.request.responseText || apidata.request.status), 
         apidata => formEnd(form));
   });
}


function setupWatchLink(parent, cid)
{
   var watchLink = parent.querySelector("[data-watched]");
   watchLink.onclick = function(event)
   {
      event.preventDefault();
      var watched = getSwap(watchLink, "data-watched");
      var failure = function(apidata)
      {
         findSwap(watchLink, "data-watched", watched); //the original;
         notifyError("Watch failed: " + apidata.request.status + " - " + apidata.request.statusText);
      };
      if(watched === "true")
      {
         findSwap(watchLink, "data-watched", "false");
         globals.api.Delete("watch", cid,
            data =>
            {
               log.Info("Remove watch " + cid + " successful!");
            }, failure);
      }
      else
      {
         findSwap(watchLink, "data-watched", "true");
         globals.api.Post("watch/" + cid, {},
            apidata =>
            {
               log.Info("Watch " + cid + " successful!");
            }, failure);
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
      //console.log(watchAlert);

      if(getLocalOption("generaltoast"))
         notifyBase("Clearing notifications for '" + getSwap(parent, "data-pwname") + "'");

      globals.api.WatchClear(cid, apidata =>
      {
         log.Info("Clear watch " + cid + " successful!");
      }, apidata =>
      {
         notifyError("Failed to clear watches for cid " + cid);
      }, apidata => //Always
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
      message = Utilities.TimeDiff(timeattr, null, true);

      if(message.toLowerCase().indexOf("now") < 0)
         message += " ago";
   }

   findSwap(item, "pwtime", message);
}

function refreshPWDates(parent) { [...parent.children].forEach(x => refreshPWDate(x)); }

function updatePWContent(pulsedata, c)
{
   //Update the content name now, might as well
   multiSwap(pulsedata, {
      pwname : c.name
   });
   thumbType(c, pulsedata);
}

function thumbType(page, element)
{
   var th = getContentThumbnailLink(page, 20, true);
   var swap = { "type" : false, "image" : false, "private" : false }; //{ "type" : null };
   if (th) 
      swap.image = th;
   else
      swap.type = page.type;
   if(!page.permissions["0"] || page.permissions["0"].toLowerCase().indexOf("r") < 0)
      swap.private = true;
   multiSwap(element, swap);
}

function easyPWContent(c, id, parent)
{
   var pulsedata = document.getElementById(id);

   if(!pulsedata)
   {
      pulsedata = cloneTemplate("pw");
      pulsedata.id = id;
      multiSwap(pulsedata, {
         pwlink: getPageLink(c.id),
         contentid : c.id
      });
      parent.appendChild(finalizeTemplate(pulsedata));
   }

   updatePWContent(pulsedata, c);

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
      useravatar: getComputedImageLink(u.avatar, 40, true),
      username: u.username
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
         count : Number(elem.getAttribute("data-count")),
         lastdate : elem.getAttribute("data-lastdate"),
         firstdate : elem.getAttribute("data-firstdate")
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
         var ct = contents[c.parentId];
         if(c.createUserId && ct) //need to check in case deleted comment or deleted content
         {
            var d = cataloguePulse(ct, users[c.createUserId], aggregate);
            updatePulseCatalogue(d.comment, c.createDate);
         }
      }
   }

   if(data.activity)
   {
      for(var i = 0; i < data.activity.length; i++)
      {
         var a = data.activity[i];
         var ct = contents[a.contentId];
         //Activity type is broken, needs to be fixed. This check is a temporary stopgap
         //Also, you COULD get activity for content that doesn't exist anymore,
         //maybe it was deleted? We don't care about deleted content in pulse
         if(a.userId > 0 && a.type==="content" && ct) //need to check in case system
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
      result[Number(getSwap(x, "contentid"))] =
         Number(x.getAttribute(attr.pulsemaxid));
   });
   return result;
}

function updateWatchGlobalAlert()
{
   var counts = watches.querySelectorAll("[data-pw]"); 
   var sum = 0;
   [...counts].forEach(x => sum += (Number(getSwap(x, attr.pulsecount)) || 0));
   watchglobalalert.textContent = sum ? String(sum) : "";
}

function updateWatchSingletons(data)
{
   updateWatchComAct(idMap(data.user), 
      idMap(DataFormat.CommentsToAggregate(data.comment)), 
      idMap(DataFormat.ActivityToAggregate(data.activity)));
}

function updateWatchComAct(users, comments, activity)
{
   //console.log("UPDATEWATCHCOMACT", users, comments, activity);
   [...new Set(Object.keys(comments).concat(Object.keys(activity)))].forEach(cid =>
   {
      //console.log("updating comments, activity:", comments, activity);
      var watchdata = document.getElementById(getWatchId(cid)); 
      //console.log(getActiveDiscussionId(), cid, comments[cid]);

      if(watchdata)
      {
         if(getActiveDiscussionId() == cid && comments[cid])
         {
            //log.Warn("SETTING NEW MAXID TO: " + comments[cid].lastId);
            watchdata.setAttribute(attr.pulsemaxid, comments[cid].lastId);
         }

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

         if(maxDate === "0")
            watchdata.removeAttribute(attr.pulsedate);
         else
            watchdata.setAttribute(attr.pulsedate, maxDate);
      }
   });

   writeDom(() =>
   {
      Utilities.SortElements(watches,
         x => x.getAttribute(attr.pulsedate) || ("0" + x.getAttribute(attr.pulsemaxid)), true);

      refreshPWDates(watches);
      updateWatchGlobalAlert();
      updateGlobalAlert();
   });
}

function updateWatches(data, fullReset)
{
   if(fullReset)
      watches.innerHTML = "";

   //console.log("UPDATEWATCHES", data);
   var users = idMap(data.user);
   var contents = idMap(data.content);
   var comments = idMap(data.commentaggregate);
   var activity = idMap(data.activityaggregate);

   if(data.watch)
   {
      //console.log("watches: ", data.watch);
      for(var i = 0; i < data.watch.length; i++)
      {
         var c = contents[data.watch[i].contentId];
         var watchdata = easyPWContent(c, getWatchId(c.id), watches);
         setupWatchClear(watchdata, c.id);
         watchdata.setAttribute(attr.pulsemaxid, data.watch[i].lastNotificationId);
      }
   }

   if(data.content)
   {
      data.content.forEach(x =>
         {
            var w = document.getElementById(getWatchId(x.id));
            if(w) updatePWContent(w, x);
         });
   }

   if(data.watchdelete)
   {
      writeDom(() =>
      {
         for(var i = 0; i < data.watchdelete.length; i++)
         {
            var w = document.getElementById(getWatchId(data.watchdelete[i].contentId));
            if(w) Utilities.RemoveElement(w);
         }
      });
   }

   //Note that because this happens before adding, if a clear comes WITH
   //comments, the comments will be added on top of the clear. That's probably
   //fine, but may not reflect reality. It's hard to say, depends on the API
   if(data.watchupdate) //ALL of these are assumed to be clears right now!!
   {
      writeDom(() =>
      {
         for(var i = 0; i < data.watchupdate.length; i++)
            clearWatchVisual(data.watchupdate[i].contentId);
      });
   }

   updateWatchComAct(users, comments, activity);
}

function clearWatchVisual(contentId)
{
   var w = document.getElementById(getWatchId(contentId));

   if(w) 
   {
      getPWUserlist(w).innerHTML = "";
      findSwap(w, attr.pulsecount, "");
      w.removeAttribute(attr.pulsedate);

      refreshPWDate(w);

      //Eventually fix this!
      updateWatchGlobalAlert();
      updateGlobalAlert();
   }
}


// ********************
// ---- Discussion ----
// ********************

function loadOlderCommentsActive()
{
   if(!globals.loadingOlderDiscussions && 
      globals.loadingOlderDiscussionsTime < performance.now() - 
      getLocalOption("scrolldiscloadcooldown"))
   {
      var activeDiscussion = getActiveDiscussion();

      if(!activeDiscussion.hasAttribute(attr.atoldest))
         loadOlderComments(activeDiscussion);
   }
}

function loadOlderComments(discussion)
{
   globals.loadingOlderDiscussions = true;

   var did = getSwap(discussion, "discussionid");
   log.Info("Loading older messages in " + did);

   var loading = discussion.querySelector("[data-loadolder] [data-loading]");
   writeDom(() => unhide(loading));

   var minId = Number.MAX_SAFE_INTEGER;
   var msgs = discussion.querySelectorAll("[data-messageid]");

   for(var i = 0; i < msgs.length; i++)
   {
      var messageId = Number(msgs[i].getAttribute("data-messageid"));
      if(messageId > 0)
         minId = Math.min(minId, messageId);
   }

   var initload = getLocalOption("oldloadcomments");
   var params = new URLSearchParams();
   params.append("requests", "comment-" + JSON.stringify({
      Reverse : true,
      Limit : initload,
      ParentIds : [ Number(did) ],
      MaxId : Number(minId)
   }));
   params.append("requests", "user.0createUserId.0edituserId");

   globals.api.Chain(params, apidata =>
   {
      log.Datalog("check dev log for oldcomments: ", apidata);
      var data = apidata.data;
      var users = idMap(data.user);
      writeDom(() =>
      {
         var oldHeight = discussions.scrollHeight;
         var oldScroll = discussions.scrollTop;
         easyComments(data.comment, users);
         discussions.scrollTop = discussions.scrollHeight - oldHeight + oldScroll;

         if(data.comment.length !== initload)
            discussion.setAttribute(attr.atoldest, "");
      });
   }, undefined, apidata => /* always */
   {
      globals.loadingOlderDiscussions = false;
      globals.loadingOlderDiscussionsTime = performance.now();
      writeDom(() => hide(loading));
   });
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
      message: comment.content,
   });
   findSwap(element, "editdate", (new Date(comment.editDate).toLocaleString()));
}

function getFragmentFrame(element)
{
   return Utilities.FindParent(element, x => x.hasAttribute("data-messageframe"));
}

function easyComments(comments, users)
{
   if(comments)
   {
      globals.commentsrendered = (globals.commentsrendered || 0) + comments.length;
      sortById(comments).forEach(x => easyComment(x, users));
      signals.Add("easycomments", { comments: comments, users: users });
      log.Debug("Rendered " + comments.length + " comments, " + globals.commentsrendered + " total");
   }
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
      hide(d.querySelector("[data-nocomments]"));

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
      if(Number(getSwap(insertFrame, "data-userid")) !== Number(comment.createUserId) ||
         (new Date(comment.createDate)).getTime() - (new Date(getSwap(insertAfter, "createdate"))).getTime() 
          > (getLocalOption("breakchatmessagetime") * 1000))
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

   var msg = copyExistingTemplate(omsg); //.cloneNode(true);
   var frame = copyExistingTemplate(oframe); //.cloneNode(true);
   var msglist = frame.querySelector(".messagelist");
   msglist.innerHTML = "";
   msglist.appendChild(msg);
   Utilities.RemoveElement(msg.querySelector(".messagecontrol"));

   var cmid = getSwap(omsg, "data-messageid");
   var rawcm = getSwap(omsg, "data-message"); 
   var msgdate = getSwap(omsg, "data-createdate");
   var msgedate = getSwap(omsg, "data-editdate");
   findSwap(oframe, "data-frametime", msgdate);

   commenteditpreview.innerHTML = "";
   commenteditpreview.appendChild(frame);

   var parsedcm = parseComment(rawcm);
   commentedittext.value = parsedcm.t;
   commenteditformat.value = parsedcm.m;
   commenteditinfo.textContent = "ID: " + cmid + "  UID: " + getSwap(oframe, "data-userid");
   if(msgedate !== msgdate) commenteditinfo.textContent += "  Edited: " + msgedate;

   commenteditdelete.onclick = function() 
   { 
      if(confirm("Are you SURE you want to delete this comment?"))
      {
         globals.api.Post("comment/" + cmid + "/delete", {},
            x => { if(getLocalOption("generaltoast")) notifySuccess("Comment deleted"); },
            x => notifyError("Couldn't delete comment: " + x.request.status + " - " + x.request.statusText));
         UIkit.modal(commentedit).hide();
      }
   };

   commenteditedit.onclick = function() 
   { 
      globals.api.Put("comment/" + cmid, 
         {parentId : Number(getActiveDiscussionId()), 
          content: createComment(commentedittext.value, commenteditformat.value)},
         x => { if(getLocalOption("generaltoast")) notifySuccess("Comment edited"); },
         x => notifyError("Couldn't edit comment: " + x.request.status + " - " + x.request.statusText));
      UIkit.modal(commentedit).hide();
   };

   commenteditshowpreview.onclick = function() 
   { 
      findSwap(msg, "data-message", createComment(commentedittext.value, commenteditformat.value));
   };

   UIkit.modal(commentedit).show();
}

function tryUpdateLongPoll(newStatuses)
{
   if(newStatuses)
   {
      if(globals.statuses && Utilities.ShallowEqual(newStatuses, globals.statuses))
      {
         log.Warn("No new statuses when updating long poll, ignoring");
         return;
      }
      globals.statuses = newStatuses;
   }

   if(globals.lastsystemid && globals.statuses)
   {
      globals.longpoller.Update(globals.lastsystemid, globals.statuses);

      //TODO: move this to a signal perhaps?
      writeDom(() =>
      {
         Object.keys(globals.statuses).forEach(x =>
         {
            clearWatchVisual(x);
         });
      });
   }
}

function mapSearchContent(content, imgsize)
{
   imgsize = imgsize || 20;
   return content.map(x =>
   ({
      type : x.type,
      imageLink : getContentThumbnailLink(x, imgsize, true),
      link : getPageLink(x.id),
      title : x.name,
      meta : (new Date(x.createDate)).toLocaleDateString()
   }));
}
function mapSearchUser(users, imgsize)
{
   imgsize = imgsize || 20;
   return users.map(x =>
   ({
      imageLink : getAvatarLink(x.avatar, imgsize),
      link : getUserLink(x.id),
      title : x.username,
      meta : (new Date(x.createDate)).toLocaleDateString()
   }));
}
function mapSearchCategories(categories, imgsize)
{
   imgsize = imgsize || 20;
   return categories.map(x =>
   ({
      type : "category",
      link : getCategoryLink(x.id),
      title : x.name,
      meta : (new Date(x.createDate)).toLocaleDateString()
   }));
}

/*function addCategoryListParam(params)
{
   params.set("content","id,name,type");
}*/

//A 12me thing for the renderer
var Nav = {
   link: function(path, element) {
      var a = cloneTemplate("sbslink");
      multiSwap(a, { "data-link" : "?p=" + path.replace(/s?\//g, "-") });
      finalizeTemplate(a);
      return a;
   }
};

