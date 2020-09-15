
// ************************
// --- DOM MANIPULATION ---
// ************************

//The dependencies for this file to work!
var DomDeps = {
   spaClick : () => { throw "Need to assign spaClick!" },
   log : (msg) => { },           //not necessary
   signal : (name, data) => {  } //not necessary
};

//Note: NOTHING in dom manipulation uses the signal system. ONLY the signalers
//do, this is so that these functions can be used by themselves wherever

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
   //topnav.setAttribute("data-pulsing", "");
   setLoading(topnav, true);
   //maincontentloading.appendChild(cloneTemplate("spinner"));
}
function removeLoading()
{
   addLoading.count--;
   if(!addLoading.count)
      setLoading(topnav, false);
      //e.removeAttribute("data-pulsing");
   //if(maincontentloading.firstElementChild)
   //   maincontentloading.removeChild(maincontentloading.firstElementChild);
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
   DomDeps.log("Initializing page to a clean slate");

   //Clear out the breadcrumbs
   breadcrumbs.innerHTML = "";

   //Clear out anything that used to be there
   maincontent.innerHTML = "";
   maincontentinfo.innerHTML = "";
   discussionuserlist.innerHTML = "";

   //Assume there are no discussions (easier to just hide it)
   formatDiscussions(false);

   //Clean page isn't loading...?
   //hide(maincontentloading);
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

function finalizeTemplate(elm)
{
   var links = elm.querySelectorAll("[data-spa]");
   [...links].forEach(x =>
   {
      x.onclick = DomDeps.spaClick(x.href);
   });
   if(elm.hasAttribute("data-spa"))
      elm.onclick = DomDeps.spaClick(elm.href);
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
         DomDeps.signal("localsettingupdate", 
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

