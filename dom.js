
// ************************
// --- DOM MANIPULATION ---
// ************************

// Note: dom.js depends on NOTHING except the html. It is purely for page setup
// actions, such as modifying html and creating elements. It fires of signals
// in case you want to pick up on what's happening and do extra stuff. There is
// NO api code, logic, request, etc here.

// Well, it's assumed that you'll be using UIkit I guess...

//The dependencies for this file to work!
var DomDeps = {
   log : (msg) => { console.log(msg); },
   signal : (name, data) => { console.log("ignoring signal " + name); }
};

//Some globals that you can mess with if you want, but they are not assumed to
//be usable except within this file. Try not to rely on the globals, use the
//functions instead please.
var domGlobals = {
   discussions : {}
};

function hide(e) { e.setAttribute("hidden", ""); }
function unhide(e) { e.removeAttribute("hidden"); }
function setHidden(e, hidden) { if(hidden) hide(e); else unhide(e); }
function setLoading(e, loading) 
{ 
   if(loading)
      e.setAttribute("data-pulsing", "");
   else
      e.removeAttribute("data-pulsing");
}
function addLoading()
{
   this.count = (this.count || 0) + 1;
   setLoading(topnav, true);
}
function removeLoading()
{
   addLoading.count--;
   if(!addLoading.count)
      setLoading(topnav, false);
}

function setConnectionState(state)
{
   const constate = "data-connectionindicator";
   var indicator = document.querySelector("[" + constate + "]");
   indicator.setAttribute(constate, state || "");
}

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
      DomDeps.log("Set login visual state to: " + loggedIn);
      toggleuserstate.click();
   }
}

function updateGlobalAlert()
{
   setHidden(globalalert, !watchglobalalert.textContent);
}

function setFullContentMode()
{
   DomDeps.log("Set full content mode");

   unhide(maincontentcontainer);
   unhide(splitmodediscussion);
   maincontentcontainer.className += " uk-flex-1";

   hide(discussionscontainer);
   hide(splitmodecontent);
   hide(fulldiscussionmode);
   hide(fullcontentmode);

   DomDeps.signal("setcontentmode", "content");
}

function setFullDiscussionMode()
{
   DomDeps.log("Set full discussion mode");

   unhide(discussionscontainer);
   unhide(splitmodecontent);

   hide(maincontentcontainer);
   hide(splitmodediscussion);
   hide(fulldiscussionmode);
   hide(fullcontentmode);

   DomDeps.signal("setcontentmode", "discussion");
}

function setSplitMode()
{
   DomDeps.log("Set split discussion/content mode");

   maincontentcontainer.className = 
   maincontentcontainer.className.replace(/uk-flex-1/g, ""); 
   unhide(discussionscontainer);
   unhide(maincontentcontainer);
   unhide(fulldiscussionmode);
   unhide(fullcontentmode);

   hide(splitmodecontent);
   hide(splitmodediscussion);

   DomDeps.signal("setcontentmode", "split");
}

function formatDiscussions(hasDiscussions)
{
   DomDeps.log("Formatting page, show discussions: " + hasDiscussions);

   if(hasDiscussions)
   {
      unhide(maincontentbar);
      unhide(discussionuserlist);
      setSplitMode(); //Could be settings?
   }
   else
   {
      hide(maincontentbar);
      hide(discussionuserlist);
      setFullContentMode();
   }

   DomDeps.signal("formatdiscussions", hasDiscussions);
}

function makeBreadcrumbs(chain)
{
   chain.forEach(x =>
   {
      var bc = cloneTemplate("breadcrumb");
      multiSwap(bc, {
         "data-link" : x.link, //x.content ? getPageLink(x.id) : getCategoryLink(x.id),
         "data-text" : x.name
      });
      finalizeTemplate(bc);
      breadcrumbs.appendChild(bc);
   });
}

//Set up a clean slate for someone to put content onto the page,
//assuming immediately after.
function initializePage(requester)
{
   DomDeps.log("Initializing page to a clean slate on behalf of: " + requester);

   //Clear out the breadcrumbs
   breadcrumbs.innerHTML = "";

   //Clear out anything that used to be there
   maincontent.innerHTML = "";
   maincontentinfo.innerHTML = "";
   discussionuserlist.innerHTML = "";

   //Assume there are no discussions (easier to just hide it)
   formatDiscussions(false);

   //Clean page isn't loading...?
   hide(maincontentloading);
   //setLoading(topnav, false);

   DomDeps.signal("pageinitialize", requester);
}

function renderPage(route, applyTemplate, breadcrumbs)
{
   DomDeps.log("Rendering final page " + route);

   initializePage();

   if(breadcrumbs)
      makeBreadcrumbs(breadcrumbs);

   var template = cloneTemplate(route);

   if(applyTemplate)
      applyTemplate(template);

   finalizeTemplate(template);
   maincontent.appendChild(template);

   DomDeps.signal("pagerender", route);
}


// ******************
// --- TEMPLATING ---
// ******************

function cloneTemplate(name)
{
   var elm = document.querySelector("#templates > [data-" + name + "]");
   if(!elm)
      throw "No template found: " + name;
   return elm.cloneNode(true);
}

function templateSpaClick(event)
{
   event.preventDefault();
   //console.log(event.target);
   DomDeps.signal("spaclick_event", { element: event.target, url: event.target.href });
}

function finalizeTemplate(elm)
{
   var links = elm.querySelectorAll("[data-spa]");
   var linkArray = [...links];

   if(elm.hasAttribute("data-spa"))
      linkArray.push(elm);

   linkArray.forEach(x => { x.onclick = templateSpaClick; });

   return elm;
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

function findSwap(element, attribute, replace) { swapBase(element, attribute, replace); }
function getSwap(element, attribute) { return swapBase(element, attribute); }

function multiSwap(element, replacements)
{
   for(key in replacements)
      findSwap(element, key, replacements[key]);
}


// *************
// --- FORMS ---
// *************

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


// **********************
// --- PAGE CONSTANTS ---
// **********************

function getDiscussionId(id) { return "discussion-" + id; }
function getDiscussionSwitchId(id) { return "discussion-" + id + "-switch"; }
function getCommentId(id) { return "comment-" + id; }
function getWatchId(cid) { return "watchitem-" + cid; }
function getPulseId(cid) { return "pulseitem-" + cid; }

function getPWUserlist(pulseitem) { return pulseitem.querySelector(".pw-users"); }


// ***************
// --- SPECIAL ---
// ***************

// Usually we don't depend on outside data formats but this is special.

function renderLogs(log)
{
   //Find the last id, only display new ones.
   DomDeps.log("Debug log shown, rendering new messages");
   var lastId = (logs.lastElementChild ? Number(logs.lastElementChild.dataset.id) : 0);
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
}

// Each option is required to have:
//  "def" (default) value
//  "value" the current value
// Optional fields are: 
//  "text" field to show it is a user-operable setting 
//  "type" to specify a special type of input for display 
//  "step" value for numeric inputs.

function renderOptions(options)
{
   DomDeps.log("Refreshing user options");

   userlocaloptions.innerHTML = "";
   developerlocaloptions.innerHTML = "";

   var lastType = false;

   if(Notification.permission === "granted" ||
      !Notification.requestPermission)
   {
      hide(allowNotifications);
   }

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
         "data-input" : o.value //getLocalOption(key)
      });
      elm.onchange = e => { 
         var val = vconv(getSwap(elm, "data-input"));
         DomDeps.signal("localsettingupdate_event", 
            { key : k, value: val, options : options });
         //setLocalOption(k, val);
      };
      finalizeTemplate(elm);

      if(lastType && lastType !== templn)
         elm.className += " uk-margin-small-top";
      if(o.step)
         findSwap(elm, "data-step", o.step);

      lastType = templn;
      prnt.appendChild(elm);
   }

   DomDeps.signal("optionrender", options);
}


// ************************
// --- DISCUSSION BASIC ---
// ************************

function getDiscussion(id)
{
   if(!domGlobals.discussions[id])
   {
      var discussion = cloneTemplate("discussion");
      multiSwap(discussion, {
         "data-id": getDiscussionId(id),
         "data-discussionid": id
      });

      var loadolder = discussion.querySelector("[data-loadolder] [data-loadmore]");
      loadolder.onclick = event => 
      {
         event.preventDefault();
         DomDeps.signal("loadoldercomments_event", discussion);
      };

      domGlobals.discussions[id] = discussion;
   }

   return domGlobals.discussions[id];
}

function getActiveDiscussion() { return discussions.querySelector("[data-did]"); }

function getActiveDiscussionId()
{
   var d = getActiveDiscussion();
   return d ? Number(d.getAttribute("data-did")) : null;
}

function showDiscussion(id)
{
   hideDiscussion(true);

   var d = getDiscussion(id);
   discussions.appendChild(d);
   DomDeps.signal("showdiscussion", { id: id, discussion: d });
}

function formatShowDiscussion(id)
{
   showDiscussion(id);
   formatDiscussions(true);
}

function hideDiscussion(quiet)
{
   var d = getActiveDiscussion();

   if(d)
   {
      d.parentNode.removeChild(d);
      DomDeps.signal("hidediscussion", { discussion: d });
   }
   else if(!quiet)
   {
      DomDeps.log("Tried to hide discussion when none was shown");
   }
}

