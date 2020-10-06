
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

function setTitle(title)
{
   if(title)
      document.title = title + " - SmileBASIC Source";
   else
      document.title = "SmileBASIC Source";
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

function formatDiscussions(hasDiscussions, mode)
{
   DomDeps.log("Formatting page, show discussions: " + hasDiscussions);

   if(hasDiscussions)
   {
      unhide(maincontentbar);
      unhide(discussionuserlist);

      if(mode === "content")
         setFullContentMode();
      else if(mode === "discussion")
         setFullDiscussionMode();
      else
         setSplitMode();
   }
   else
   {
      hide(maincontentbar);
      hide(discussionuserlist);
      setFullContentMode();
   }

   DomDeps.signal("formatdiscussions", { hasDiscussion : hasDiscussions, mode : mode});
}

function setExpandableTextbox(expand)
{
   if(expand)
      postdiscussiontext.removeAttribute("data-expand");
   else
      postdiscussiontext.setAttribute("data-expand", "");
}

function setTheme(theme)
{
   if(theme)
      document.body.setAttribute("data-theme", theme);
   else
      document.body.removeAttribute("data-theme");

   DomDeps.signal("settheme", theme);
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
   //var templates = document.getElementById("templates");
   var elm = templates.querySelector("#templates > [data-" + name + "]");
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

   linkArray.forEach(x => { 
      x.onclick = templateSpaClick; 
      x.removeAttribute("data-spa");
   });

   var tmpls = elm.querySelectorAll("[data-tmpl]");
   [...tmpls].forEach(x => replaceTemplate(x));

   DomDeps.signal("finalizetemplate", { element:elm });

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

   if(!name)
      throw "Couldn't find attribute " + attribute + " in template swap";

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

function replaceTemplate(element)
{
   var tmpl = cloneTemplate(element.getAttribute("data-tmpl"));
   multiSwap(tmpl, JSON.parse(element.getAttribute("data-tmpld")));
   [...element.attributes].forEach(x =>
   {
      if(x.name !== "data-tmpl" && x.name !== "data-tmpld")
         tmpl.setAttribute(x.name, x.value);
   });
   finalizeTemplate(tmpl);
   DomDeps.signal("replacetemplate", { original: element, replacement: tmpl });
   element.parentNode.replaceChild(tmpl, element);
}


// ******************
// - SUB-TEMPLATING -
// ******************

function makeSearchResult(imageLink, link, title, meta)
{
   var result = cloneTemplate("searchresult");
   var swap = {
      "data-link": link,
      "data-name": title,
      "data-meta": meta
   };

   if(imageLink)
      swap["data-image"] = imageLink;

   multiSwap(result, swap);
   finalizeTemplate(result);
   return result;
}

function makeMiniSearchResult(imageLink, name, onclick)
{
   var sr = cloneTemplate("minisearchresult");
   multiSwap(sr, {
      "data-image": imageLink,
      "data-name": name
   });
   finalizeTemplate(sr);
   sr.onclick = onclick;
   return sr;
}

function makePermissionUser(imageLink, name, permissions)
{
   var sr = cloneTemplate("permissionuser");
   multiSwap(sr, {
      "data-image": imageLink,
      "data-name": name
   });
   if(permissions !== undefined)
      findSwap(sr, "data-value", permissions);
   else
      hide(sr.querySelector("[data-permission]"));
   finalizeTemplate(sr);
   return sr;
}

function makeBreadcrumbs(chain)
{
   chain.forEach(x =>
   {
      var bc = cloneTemplate("breadcrumb");
      multiSwap(bc, {
         "data-link" : x.link,
         "data-text" : x.name
      });
      finalizeTemplate(bc);
      breadcrumbs.appendChild(bc);
   });
}

function recurseTreeSelector(node, selector, path, processed)
{
   if(!processed.some(x => x.id === node.id))
   {
      var option = document.createElement("option");
      var level = path.length;
      var newPath = path.slice();
      newPath.push(node);
      option.value = node.id;
      option.setAttribute("data-name", node.name);
      option.setAttribute("data-path", newPath.map(x => x.name).join(" / "));
      option.setAttribute("data-tree", ((level > 0) ? ("| ".repeat(level - 1) + "|-") : "") + node.name);
      option.setAttribute("title", node.description);
      option.textContent = option.getAttribute("data-path");
      selector.appendChild(option);
      processed.push(node);
      node.children.forEach(x => recurseTreeSelector(x, selector, newPath, processed));
   }
   //node.children.sort((a, b) => Math.sign(a.id - b.id));
}

function fillTreeSelector(tree, selector)
{
   //var selector = cloneTemplate("treeselector");
   var rootNodes = tree.filter(x => x.id === 0);

   if(!rootNodes.length)
      throw "Can't make a tree without an id 0 root node!";

   //We're TRUSTING that the tree's 0 id is the root or whatever. Otherwise
   //this entire thing breaks down.
   rootNodes.forEach(x => recurseTreeSelector(x, selector, [], []));

   finalizeTemplate(selector);
   return selector;
}

function makeYoutube(url, playerurl)
{
   var youtube = cloneTemplate("youtube");
   multiSwap(youtube, {
      "data-title" : url,
      "data-link" : url
   });
   var showplayer = youtube.querySelector("[data-showplayer]");
   var hideplayer = youtube.querySelector("[data-hideplayer]");

   if(playerurl)
   {
      showplayer.onclick = e =>
      {
         e.preventDefault();
         var player = cloneTemplate("youtubeplayer");
         multiSwap(player, {
            "data-source" : playerurl 
         });
         youtube.appendChild(player);
         hide(showplayer);
         unhide(hideplayer);
      };
      hideplayer.onclick = e =>
      {
         //console.log(youtube);
         e.preventDefault();
         [...(youtube.querySelectorAll("[data-youtubeplayer]"))].forEach(
            x => x.parentNode.removeChild(x));
         unhide(showplayer);
         hide(hideplayer);
      };
   }
   else
   {
      hide(showplayer);
      hide(hideplayer);
   }
   finalizeTemplate(youtube);
   return youtube;
}

function makeCollectionItem(element, getValue, key)
{
   var item = cloneTemplate("collectionitem");
   item.querySelector("[data-item]").appendChild(element);
   if(key)
      item.setAttribute("data-key", key);
   finalizeTemplate(item);
   item.getValue = getValue;
   return item;
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

//https://stackoverflow.com/a/6394168/1066474
function formIndex(obj,is, value) 
{
   if (typeof is == 'string')
   {
      return formIndex(obj,is.split('.'), value);
   }
   else
   {
      if(value !== undefined && !(is[0] in obj))
         obj[is[0]] = {};

      if (is.length==1 && value!==undefined)
         return obj[is[0]] = value;
      else if (is.length==0)
         return obj;
      else
         return formIndex(obj[is[0]],is.slice(1), value);
   }
}

function formSerialize(form, base)
{
   //TRY to get inputs by name, get values based on what kind they are.
   var inputs = form.querySelectorAll("[name]");
   var result = base || {};
   for(var i = 0; i < inputs.length; i++)
   {
      var elm = inputs[i];
      var tag = elm.tagName.toLowerCase();
      var name = elm.getAttribute('name');
      if(tag === "input" || tag === "textarea" || tag==="select")
      {
         formIndex(result, name, elm.value);
      }
      else if(elm.hasAttribute("data-collection"))
      {
         var val = elm.querySelector("[data-key]") ? {} : [];
         [...elm.querySelectorAll("[data-collectionitem]")].forEach(x =>
         {
            var key = x.getAttribute('data-key');
            if(key)
               val[key] = x.getValue(x);
            else
               val.push(x.getValue(x));
         });
         result[name] = val;
      }
   }
   //console.log("form:", result);
   return result;
}

function formFill(form, data)
{
   if(!data)
      return;

   //TRY to get inputs by name
   var inputs = form.querySelectorAll("[name]");
   for(var i = 0; i < inputs.length; i++)
   {
      var key = inputs[i].getAttribute("name");
      var val = undefined;

      try
      {
         val = formIndex(data, key);
      }
      catch(ex)
      {
         DomDeps.log("FORM WARNING: can't fill field " + key + ": " + ex.message);
         continue;
      }
      //console.log("KEY: ", key);

      if(val !== undefined)
      {
         var tag = inputs[i].tagName.toLowerCase();
         if(tag === "input" || tag === "textarea" || tag==="select")
         {
            DomDeps.log("setting form " + key  + " to " + val);
            inputs[i].value = val;
         }
      }
   }
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
//  "u" to signal it's a user setting
//  "text" field to show something nice for the setting
//  "type" to specify a special type of input for display 
//  "step" value for numeric inputs.

function renderOptions(options)
{
   DomDeps.log("Refreshing user options");

   userlocaloptions.innerHTML = "";
   developerlocaloptions.innerHTML = "";

   var lastType = false;

   //Set up options
   for(key in options)
   {
      var o = options[key];
      var prnt = userlocaloptions;
      var templn = o.type;
      let vconv = x => x;

      if(!o.u) //oops, this is a developer option
         prnt = developerlocaloptions;

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
         else if(o.options)
         {
            templn = "select";
         }
         else 
         {
            templn = "raw";
         }
      }

      let elm = cloneTemplate(templn + "option");
      let k = key;
      if(o.text) findSwap(elm, "data-name", "options." + k);
      if(o.options) findSwap(elm, "data-options", o.options);
      multiSwap(elm, { //PUT THIS LAST so input happens AFTEr options
         "data-text" : o.text || k,
         "data-input" : o.value
      });
      elm.onchange = e => { 
         var val = vconv(getSwap(elm, "data-input"));
         DomDeps.signal("localsettingupdate_event", 
            { key : k, value: val, options : options });
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

function displaySearchResults(container, results)
{
   if(results.length)
   {
      var list = container.querySelector("[data-results]");

      list.innerHTML = "";
      findSwap(container, "data-count", results.length);
      unhide(container);

      results.forEach(x => 
      {
         list.appendChild(makeSearchResult(x.imageLink, x.link, x.title, x.meta));
      });
   }
}

function displayMiniSearchResults(container, results, onSelect)
{
   container.innerHTML = "";

   if(results.length)
   {
      results.forEach(x => 
      {
         container.appendChild(makeMiniSearchResult(
            x.imageLink, x.name, () => onSelect(x)));
      });
   }
   else
   {
      var p = document.createElement("p");
      p.textContent="No results...";
      container.appendChild(p);
   }
}

// ************************
// --- DISCUSSION BASIC ---
// ************************

function getDiscussion(id)
{
   var discussion = document.getElementById(getDiscussionId(id));

   if(!discussion)
   {
      discussion = cloneTemplate("discussion");
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

      discussionmemory.appendChild(discussion);
   }

   return discussion;
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

function hideDiscussion(quiet)
{
   var d = getActiveDiscussion();

   if(d)
   {
      discussionmemory.appendChild(d);
      DomDeps.signal("hidediscussion", { discussion: d });
   }
   else if(!quiet)
   {
      DomDeps.log("Tried to hide discussion when none was shown");
   }
}

