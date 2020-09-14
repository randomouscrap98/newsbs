
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
      setSplitMode(); //Could be settings?
   }
   else
   {
      hide(maincontentbar);
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
   setLoading(topnav, false);

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

