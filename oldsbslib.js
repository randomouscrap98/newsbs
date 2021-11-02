// Carlos Sanchez - 2017
// randomouscrap98@aol.com
// An enormous library full of garbage

// ---- List of utilities ----
// * TypeUtilities
// * HTMLUtilities
// * StorageUtilities
// * URLUtilities
// * RequestUtilities
// * StyleUtilities
// * CanvasUtilities
// * EventUtilities
// * ScreenUtilities
// * MathUtilities
// * DateUtilities
// * ArrayUtilities

// --- Shims ---
// Maybe your browser sucks and we have to fill in for it. Whatever.

//At LEAST make sure console logging doesn't completely break the script.
if (!window.console) window.console = {};
if (!window.console.log) window.console.log = function() {};

if (!String.prototype.trim) 
   String.prototype.trim = function () { return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ''); };

if (!Array.prototype.indexOf)
{
   //Taken directly from ECMA-262 or whatever.
   Array.prototype.indexOf = function(value, fromIndex)
   {
      if(this === null) throw new TypeError('"this" is null or not defined');
      var o = Object(this);
      var len = o.length >>> 0;
      if(len === 0) return -1;
      var n = fromIndex | 0;
      if(n >= len) return -1;
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
      while (k < len) if (k in o && o[k] === searchElement) return k;
      return -1;
   };
}

// https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
if (!String.prototype.padStart) 
{
   String.prototype.padStart = function padStart(targetLength,padString) 
   {
      targetLength = targetLength>>0; //floor if number or convert non-number to 0;
      padString = String(padString || ' ');
      if (this.length > targetLength) 
      {
         return String(this);
      }
      else 
      {
         targetLength = targetLength-this.length;
         if (targetLength > padString.length) 
         {
            padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
         }
         return padString.slice(0,targetLength) + String(this);
      }
   };
}

//This type of shim doesn't execute the selector function every time. A
//suitable function is chosen NOW, then assigned as a shim. 
window.requestAnimationFrame = (function() {
   return window.requestAnimationFrame || window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame || window.oRequestAnimationFrame || 
          window.msRequestAnimationFrame ||
          function(callback) { window.setTimeout(callback, 1000 / 60); };
})();

// Source: https://github.com/jserz/js_piece/blob/master/DOM/ParentNode/prepend()/prepend().md
(function (arr) 
{
   arr.forEach(function (item) 
   {
      if (item.hasOwnProperty('prepend')) 
      {
         return;
      }
      Object.defineProperty(item, 'prepend', 
      {
         configurable: true,
         enumerable: true,
         writable: true,
         value: function prepend() 
         {
            var argArr = Array.prototype.slice.call(arguments),
            docFrag = document.createDocumentFragment();

            argArr.forEach(function (argItem) 
            {
               var isNode = argItem instanceof Node;
               docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
            });

            this.insertBefore(docFrag, this.firstChild);
         }
      });
   });
})([Element.prototype, Document.prototype, DocumentFragment.prototype]);

// --- Library OnLoad Setup ---
// This stuff needs to be performed AFTER the document is loaded and all that.
window.addEventListener("load", function()
{
   UXUtilities._Setup();
});

// --- Extensions ---
// Extensions to existing prototypes (yeah, I know you're not supposed to do this)

//Returns a function that calls the associated function with any extra
//given arguments. It fixes loop closure issues. Altered from 
//www.cosmocode.de/en/blog/gohr/2009-10/15-javascript-fixing-the-closure-scope-in-loops
//Example: You want x.addEventListener("click", myfunc(i)) in a loop.
//Do this: x.addEventListener("click", myfunc.callBind(i))
Function.prototype.callBind = function()
{
   var fnc = this;
   var args = arguments;
   return function() 
   {
      return fnc.apply(this, args);
   };
};

// --- TypeUtilities ---
// Functions for working with or detecting types.

var TypeUtilities =
{
   IsFunction: function(x)
   {
      return x && Object.prototype.toString.call(x) == '[object Function]';
   },
   IsArray: function(x)
   {
      return x && x.constructor === Array;
   },
   IsString: function(x)
   {
      return x && x.constructor === String;
   }
};

// --- HTMLUtilities ---
// Encode or decode HTML entitities / generate unique IDs for elements / etc.

var HTMLUtilities = 
{
   _nextID : 0,
   UnescapeHTML : function(string) 
   {
      var elem = document.createElement("textarea");
      elem.innerHTML = string;
      return elem.value;
   },
   EscapeHTML : function(html)
   {
      var text = document.createTextNode(html);
      var div = document.createElement('div');
      div.appendChild(text);
      return div.innerHTML;
   },
   RemoveSelf : function(element)
   {
      element.parentNode.removeChild(element);
   },
   InsertBeforeSelf : function(newElement, element)
   {
      element.parentNode.insertBefore(newElement, element);
   },
   InsertAfterSelf : function(newElement, element)
   {
      element.parentNode.insertBefore(newElement, element.nextSibling);
   },
   InsertFirst : function(newElement, parent)
   {
      parent.insertBefore(newElement, parent.firstElementChild);
   },
   Replace : function(oldElement, newElement)
   {
      HTMLUtilities.InsertBeforeSelf(newElement, oldElement);
      HTMLUtilities.RemoveSelf(oldElement);
   },
   MoveToEnd : function(element)
   {
      element.parentNode.appendChild(element);
   },
   GetUniqueID : function(base)
   {
      return "genID_" + this._nextID++ + (base ? "_" + base : "");
   },
   NodeListToArray : function(nodeList)
   {
      var tempArray = [];

      for(var i = 0; i < nodeList.length; i++)
         tempArray.push(nodeList[i]);

      return tempArray;
   },
   FindParentFromAction : function(element, action)
   {
      var nextElement = element;

      while(!action(nextElement))
      {
         if(nextElement.tagName.toLowerCase() === "body")
            return false;

         nextElement = nextElement.parentNode;
      }

      return nextElement;
   },
   FindParentWithClass : function(element, className)
   {
      var regex = new RegExp("\\b" + className + "\\b");

      return HTMLUtilities.FindParentFromAction(element,
         function(nextElement) 
         {
            return regex.test(nextElement.className);
         }); 
   },
   FindParentWithTag : function(element, tagName)
   {
      return HTMLUtilities.FindParentFromAction(element,
         function(nextElement)
         {
            return nextElement.tagName.toLowerCase() === tagName.toLowerCase();
         }); 
   },
   SimulateRadioSelect : function(selected, parent, selectedAttribute, selectedValue)
   {
      selectedAttribute = selectedAttribute || "data-selected";
      selectedValue = selectedValue || "true";
      var fakeRadios = parent.querySelectorAll("[" + selectedAttribute + "]");
      for(var i = 0; i < fakeRadios.length; i++)
         fakeRadios[i].removeAttribute(selectedAttribute);
      selected.setAttribute(selectedAttribute, selectedValue);
   },
   CreateUnsubmittableButton : function(text)
   {
      var button = document.createElement('button');
      button.setAttribute("type", "button");
      if(text) button.innerHTML = text;
      return button;
   },
   CreateContainer : function(className, id)
   {
      var container = document.createElement("div");
      container.className = className;
      if(id) container.id = id;
      container.dataset.createdon = new Date().getTime();
      return container;
   },
   CreateSelect : function(options, name)
   {
      var select = document.createElement("select");
      if(name) select.setAttribute("name", name);
      for(var i = 0; i < options.length; i++)
      {
         var option = document.createElement("option");
         if(options[i].value && options[i].text)
         {
            option.innerHTML = options[i].text;
            option.setAttribute("value", options[i].value);
         }
         else
         {
            option.innerHTML = options[i];
         }
         select.appendChild(option);
      }
      return select;
   },
   SwapElements : function (obj1, obj2) 
   {
      // save the location of obj2
      var parent2 = obj2.parentNode;
      var next2 = obj2.nextSibling;
      // special case for obj1 is the next sibling of obj2
      if (next2 === obj1) {
         // just put obj1 before obj2
         parent2.insertBefore(obj1, obj2);
      } else {
         // insert obj2 right before obj1
         obj1.parentNode.insertBefore(obj2, obj1);
         // now insert obj1 where obj2 was
         if (next2) {
            // if there was an element after obj2, then insert obj1 right before that
            parent2.insertBefore(obj1, next2);
         } else {
            // otherwise, just append as last child
            parent2.appendChild(obj1);
         }
      }
   }
};

//Allows the generation of a simulated radio using any type of element. More
//robust than the HTMLUtilities function; allows selection of radios based on
//string value.
var RadioSimulator = function(container, attribute, callback, clickCycle)
{
   this.container = container;
   this.attribute = attribute;
   this.callback = callback;
   this.clickCycle = clickCycle;
   this.selectedAttribute = "data-selected";
};

//Allows manual selection of radio button. Can also select by value (simply
//pass the string value of the button to select.)
RadioSimulator.prototype.SelectRadio = function(button)
{
   console.debug("Selecting radio: ");
   console.debug(button);

   if(TypeUtilities.IsString(button))
   {
      button = this.container.querySelector('[' + this.attribute + '="' + button + '"]');
   }
   else if(this.clickCycle && button.hasAttribute(this.selectedAttribute))
   {
      var radios = this.container.querySelectorAll("[" + this.attribute + "]");
      for(var i = 0; i < radios.length; i++)
      {
         if(radios[i] === button)
         {
            button = radios[(i + 1) % radios.length];
            break;
         }
      }
   }

   var value = button.getAttribute(this.attribute);

   if(!value)
   {
      console.log("Could not select radio using this button! There is no " + this.attribute + " attribute!");
      return;
   }

   if(this.callback)
      this.callback(value, button);

   if(!this.container)
   {
      console.log("There is no container for this RadioSimulator!");
      return;
   }

   HTMLUtilities.SimulateRadioSelect(button, this.container, this.selectedAttribute);
};

RadioSimulator.prototype.CreateRadioButton = function(text, value)
{
   var button = HTMLUtilities.CreateUnsubmittableButton(text); 
   var me = this;
   button.setAttribute(this.attribute, value);
   button.addEventListener("click", function(e) { me.SelectRadio(button); });
   return button;
};

RadioSimulator.prototype.GetSelected = function()
{
   return this.container.querySelector("[" + this.selectedAttribute + "]");
};

//Provides toast messages in a container centered near the bottom of the
//screen. You can create multiple toasters, but by default they'll all overlap
//each other. If you need custom styling per toaster, style off the
//container.id
function Toaster()
{
   this.minDuration = 2000;
   this.maxDuration = 10000;
   this.container = false;
}

Toaster.ToastClass = "randomousToast";
Toaster.ContainerClass = "randomousToastContainer";
Toaster.StyleID = HTMLUtilities.GetUniqueID("toastStyle");

Toaster.TrySetDefaultStyles = function()
{
   var style = StyleUtilities.TrySingleStyle(Toaster.StyleID);

   if(style)
   {
      console.log("Setting up Toast default styles for the first time");
      style.AppendClasses(Toaster.ContainerClass, 
         ["position:absolute","bottom:1em","left:50%","transform:translate(-50%,0)",
          "z-index:2000000000","pointer-events: none"]);
      style.Append("." + Toaster.ContainerClass + "[data-fullscreen]",
         ["position:fixed"]);
      style.AppendClasses(Toaster.ToastClass,
         ["max-width: 70vw","font-family:monospace","font-size:0.8rem",
          "padding:0.5em 0.7em","background-color:#EEE","border-radius:0.5em",
          "color:#333","opacity:1.0","transition: opacity 1s", "display: block",
          "margin-bottom:0.1em","box-shadow: 0 0 1em -0.3em rgba(0,0,0,0.6)",
          "overflow: hidden","text-overflow: ellipsis","text-align: center"]);
      style.Append("." + Toaster.ToastClass + "[data-fadingout]",
         ["opacity:0"]);
      style.Append("." + Toaster.ToastClass + "[data-initialize]",
         ["opacity:0"]);
      style.Append("." + Toaster.ToastClass + "[data-fadingin]",
         ["transition:opacity 0.2s"]);
   }
};

Toaster.prototype.Attach = function(toasterParent)
{
   Toaster.TrySetDefaultStyles();
   if(this.container) throw "Toaster already attached: " + this.container.id;

   this.container = HTMLUtilities.CreateContainer(Toaster.ContainerClass,
      HTMLUtilities.GetUniqueID("toastContainer"));

   toasterParent.appendChild(this.container);
};

Toaster.prototype.AttachFullscreen = function(toasterParent)
{
   this.Attach(toasterParent || document.body);
   this.container.dataset.fullscreen = "true";
};

Toaster.prototype.Detach = function()
{
   if(!this.container) throw "Toaster not attached yet!";

   HTMLUtilities.RemoveSelf(this.container);
   this.container = false;
};

Toaster.prototype.Toast = function(text, duration)
{
   if(!this.container) throw "Toaster not attached yet!";

   duration = duration || MathUtilities.MinMax(text.length * 50, this.minDuration, this.maxDuration); 

   var toast = document.createElement("div");
   toast.className = Toaster.ToastClass;
   toast.dataset.createdon = new Date().getTime();
   toast.dataset.initialize = "true";
   toast.dataset.fadingin = "true";
   toast.innerHTML = text;

   console.debug("Popping toast: " + text);
   this.container.appendChild(toast); 

   setTimeout(function() { toast.removeAttribute("data-initialize"); }, 10);
   //Give a big buffer zone of fadingin just in case people have long effects
   setTimeout(function() { toast.removeAttribute("data-fadingin"); }, 1000);
   setTimeout(function() { toast.dataset.fadingout = "true"; }, duration);
   //Give a big buffer zone of fadingout just in case people have long effects
   setTimeout(function() { HTMLUtilities.RemoveSelf(toast); }, duration + 2000);
};

//Allows fading of any element it's attached to. Element must have position:
//relative or absolute or something.
function Fader() { }

Fader.FaderClass = "randomousFader";
Fader.StyleID = HTMLUtilities.GetUniqueID("faderStyle");

Fader.TrySetDefaultStyles = function()
{
   var style = StyleUtilities.TrySingleStyle(Fader.StyleID);

   if(style)
   {
      console.log("Setting up Fader default styles for the first time");
      style.AppendClasses(Fader.FaderClass, 
         ["position:absolute","top:0","left:0","width:100%","height:100%",
          "padding:0","margin:0","pointer-events:none","display:block",
          "z-index:1900000000"]);
      style.Append("." + Fader.FaderClass + "[data-fullscreen]",
         ["width:100vw","height:100vh","position:fixed"]);
   }
};

Fader.CreateFadeElement = function() 
{
   var element = document.createElement("div");
   element.className = Fader.FaderClass;
   element.id = HTMLUtilities.GetUniqueID("fader");
   return element;
};

Fader.prototype.Attach = function(faderParent)
{
   Fader.TrySetDefaultStyles();
   if(this.element) throw "Tried to attach fader but already attached: " + this.element.id;
   this.element = Fader.CreateFadeElement(); 
   faderParent.appendChild(this.element);
};

Fader.prototype.AttachFullscreen = function(faderParent)
{
   this.Attach(faderParent || document.body);
   this.element.dataset.fullscreen = "true";
};

Fader.prototype.Detach = function()
{
   if(!this.element) throw "Not attached yet";
   HTMLUtilities.RemoveSelf(this.element);
   this.element = false;
};

Fader.prototype.Fade = function(fadeDuration, color, cover)
{
   if(cover)
      this.element.style.pointerEvents = "auto";
   else
      this.element.style.pointerEvents = "none";

   this.element.style.transition = "background-color " + fadeDuration + "ms";
   var me = this;
   setTimeout(function() { me.element.style.backgroundColor = color; }, 1);
};

//Creates a dialog-box complete with buttons. A good replacement for
//alert/confirm/etc.
function DialogBox()
{
   //Since fader is "internal", parameters for fading should be too.
   this.fader = new Fader();
   this.fadeInTime = 100;
   this.fadeOutTime = 100;
   this.fadeColor = "rgba(0,0,0,0.5)";

   this.container = false;
}

DialogBox.DialogClass = "randomousDialog";
DialogBox.ContainerClass = "randomousDialogContainer";
DialogBox.TextClass = "randomousDialogText";
DialogBox.ButtonContainerClass = "randomousDialogButtonContainer";
DialogBox.StyleID = HTMLUtilities.GetUniqueID("dialogStyle");

DialogBox.TrySetDefaultStyles = function()
{
   var style = StyleUtilities.TrySingleStyle(DialogBox.StyleID);

   if(style)
   {
      console.log("Setting up DialogBox default styles for the first time");
      style.AppendClasses(DialogBox.ContainerClass, 
         ["position:absolute","top:50%","left:50%","transform:translate(-50%,-50%)",
          "padding:0","margin:0","z-index:2000000000"]);
      style.Append("." + DialogBox.ContainerClass + "[data-fullscreen]", 
         ["position:fixed"]);
      style.AppendClasses(DialogBox.DialogClass,
         ["max-width: 70vw","font-family:monospace","font-size:1.0rem",
          "padding:1.0em 1.2em","background-color:#EEE","border-radius:0.5em",
          "color:#333","opacity:1.0","transition: opacity 0.2s",
          "display: block","box-shadow: 0 0 1em -0.3em rgba(0,0,0,0.6)"]);
      style.AppendClasses(DialogBox.TextClass,
         ["display: block","font-family: monospace", "overflow: hidden",
          "text-overflow: ellipsis","margin-bottom: 0.5em","white-space:pre-wrap"]);
      style.AppendClasses(DialogBox.ButtonContainerClass,
         ["text-align: center","display: block"]);
      style.Append("." + DialogBox.ButtonContainerClass + " button",
         ["border: none","font-family: monospace", "overflow: hidden",
          "text-overflow: ellipsis","font-size: 1.0em","font-weight:bold",
          "padding: 0.3em 0.5em","margin: 0.2em 0.4em","border-radius:0.35em",
          "background-color: #DDD","display: inline","cursor:pointer"]);
      style.Append("." + DialogBox.ButtonContainerClass + " button:hover",
         ["background-color: #CCC"]);
   }
};

DialogBox.prototype.Attach = function(dialogParent)
{
   DialogBox.TrySetDefaultStyles();
   if(this.container) throw "DialogBox already attached: " + this.container.id;

   this.container = HTMLUtilities.CreateContainer(DialogBox.ContainerClass,
      HTMLUtilities.GetUniqueID("dialogContainer"));

   this.fader.Attach(dialogParent);
   dialogParent.appendChild(this.container);
};

DialogBox.prototype.AttachFullscreen = function(dialogParent)
{
   this.Attach(dialogParent || document.body);
   this.fader.Detach();
   this.fader.AttachFullscreen(dialogParent);
   this.container.dataset.fullscreen = "true";
};

DialogBox.prototype.Detach = function()
{
   if(!this.container) throw "DialogBox not attached yet!";

   this.fader.Detach();
   HTMLUtilities.RemoveSelf(this.container);
   this.container = false;
};

DialogBox.prototype.Show = function(text, buttons)
{
   var dialog = HTMLUtilities.CreateContainer(DialogBox.DialogClass);
   var dialogText = document.createElement("span");
   var dialogButtons = HTMLUtilities.CreateContainer(DialogBox.ButtonContainerClass);
   dialogText.innerHTML = text;
   dialogText.className = DialogBox.TextClass;
   dialog.appendChild(dialogText);
   dialog.appendChild(dialogButtons);

   var i;
   var me = this;

   for(i = 0; i < buttons.length; i++)
   {
      var btext = buttons[i];
      if(buttons[i].text) btext = buttons[i].text;
      var callback = buttons[i].callback;
      var newButton = HTMLUtilities.CreateUnsubmittableButton(btext);

      /* jshint ignore: start */
      newButton.addEventListener("click", function(callback)
      {
         HTMLUtilities.RemoveSelf(dialog);

         if(me.container.childNodes.length === 0)
            me.fader.Fade(me.fadeOutTime, "rgba(0,0,0,0)", false);

         if(callback)
            callback();
      }.callBind(callback));
      /* jshint ignore: end */

      dialogButtons.appendChild(newButton);
   }

   me.fader.Fade(me.fadeInTime, me.fadeColor, true);
   me.container.appendChild(dialog);
};

// --- UXUtilities ---
// Utilities specifically for User Experience. Things like custom alerts,
// custom confirms, toast, etc. 

var UXUtilities = 
{
   UtilitiesContainer : HTMLUtilities.CreateContainer("randomousUtilitiesContainer", 
      HTMLUtilities.GetUniqueID("utilitiesContainer")),
   _DefaultToaster : new Toaster(),
   _ScreenFader : new Fader(),
   _DefaultDialog : new DialogBox(),
   _Setup : function()
   {
      document.body.appendChild(UXUtilities.UtilitiesContainer);
      UXUtilities._DefaultToaster.AttachFullscreen(UXUtilities.UtilitiesContainer);
      UXUtilities._ScreenFader.AttachFullscreen(UXUtilities.UtilitiesContainer);
      UXUtilities._DefaultDialog.AttachFullscreen(UXUtilities.UtilitiesContainer);
   },
   Toast : function(message, duration) 
   { 
      UXUtilities._DefaultToaster.Toast(message,duration);
   },
   FadeScreen : function(duration, color)
   {
      UXUtilities._ScreenFader.Fade(duration, color);
   },
   Confirm : function(message, callback, yesMessage, noMessage)
   {
      UXUtilities._DefaultDialog.Show(message, [
         { text: noMessage || "No", callback: function() { callback(false); }},
         { text: yesMessage || "Yes", callback: function() { callback(true); }}
      ]);
   },
   Alert : function(message, callback, okMessage)
   {
      UXUtilities._DefaultDialog.Show(message, [
         { text: okMessage || "OK", callback: function() { if(callback) callback(); }}
      ]);
   }
};

// --- StorageUtilities ---
// Retrieve and store data put into browser storage (such as cookies,
// localstorage, etc.

var StorageUtilities =
{
   GetAllCookies : function()
   {
      var cookies = {};
      var cookieStrings = document.cookie.split(";");

      for(var i = 0; i < cookieStrings.length; i++)
      {
         var matches = /([^=]+)=(.*)/.exec(cookieStrings[i]);

         if(matches && matches.length >= 3)
            cookies[matches[1].trim()] = matches[2].trim();
      }

      return cookies;
   },
   GetPHPSession : function()
   {
      return StorageUtilities.GetAllCookies().PHPSESSID;
   },
   WriteSafeCookie : function(name, value, expireDays)
   {
      var expire = new Date();
      var storeValue = Base64.encode(JSON.stringify(value));
      expireDays = expireDays || 356;
      expire.setTime(expire.getTime() + (expireDays * 24 * 60 * 60 * 1000));
      document.cookie = name + "=" + storeValue + "; expires=" + expire.toUTCString();
   },
   ReadRawCookie : function(name)
   {
      return StorageUtilities.GetAllCookies()[name];
   },
   ReadSafeCookie : function(name)
   {
      var raw = StorageUtilities.ReadRawCookie(name);

      if(raw)
         return JSON.parse(Base64.decode(raw));

      return null;
   },
   HasCookie : function(name)
   {
      return name in StorageUtilities.GetAllCookies();
   },
   WriteLocal : function(name, value)
   {
      localStorage.setItem(name, JSON.stringify(value));
   },
   ReadLocal : function (name)
   {
      try
      {
         return JSON.parse(localStorage.getItem(name));
      }
      catch(error)
      {
         //console.log("Failed to retrieve " + name + " from local storage");
         return undefined;
      }
   }
};

// --- URLUtilities ---
// Functions for parsing/manipulating URLs and... stuff.

var URLUtilities =
{
   GetQueryString : function(url)
   {
      var queryPart = url.match(/(\?[^#]*)/);
      if(!queryPart) return "";
      return queryPart[1];
   },
   //Taken from Tarik on StackOverflow:
   //http://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
   GetQueryVariable : function(variable, url) 
   {
      var query = url ? URLUtilities.GetQueryString(url) : window.location.search;
      var vars = query.substring(1).split('&');

      for (var i = 0; i < vars.length; i++) 
      {
         var pair = vars[i].split('=');

         if (decodeURIComponent(pair[0]) == variable) 
            return decodeURIComponent(pair[1]);
      }

      return null;
   },
   AddQueryVariable : function(variable, value, url)
   {
      if(URLUtilities.GetQueryString(url)) 
         url += "&"; 
      else
         url += "?";

      return url + variable + "=" + value;
   }
};

//Special console logging
var _loglevel = 0;
console.debug = function() {};
console.trace = function() {};

if(URLUtilities.GetQueryVariable("trace"))
   _loglevel = 100;
else if(URLUtilities.GetQueryVariable("debug"))
   _loglevel = 50;

if(_loglevel >= 50)
{
   console.log("Debug mode is activated.");
   console.debug = console.log;
}
if(_loglevel >= 100)
{
   console.log("Trace mode is activated.");
   console.trace = console.log;
}

// --- Request ---
// Helpers for POST/GET requests

var RequestUtilities = 
{
   XHRSimple : function(page, callback, data, extraHeaders)
   {
      var xhr = new XMLHttpRequest();

      if(data)
         xhr.open("POST", page);
      else
         xhr.open("GET", page);

      if(extraHeaders)
      {
         for(var key in extraHeaders)
         {
            if(extraHeaders.hasOwnProperty(key))
               xhr.setRequestHeader(key, extraHeaders[key]);
         }
      }

      //Use generic completion function with given success callback
      xhr.addEventListener("load", function(event) 
      {
         try
         {
            callback(event.target.response);
         }
         catch(e)
         {
            console.log("Oops, XHR callback didn't work. Dumping exception");
            console.log(e);
         }
      });

      if(data)
         xhr.send(data);
      else
         xhr.send();
   },
   XHRJSON: function(page, callback, data)
   {
      RequestUtilities.XHRSimple(page, function(response)
      {
         callback(JSON.parse(response));
      }, data, {"Content-type": "application/json"});
   }
};

// --- Color / Color Utilities ---
// Functions objects for working with colors in a generic way. Any canvas
// functions will use this object rather than some specific format.
function Color(r,g,b,a)
{
   this.r = r;
   this.g = g;
   this.b = b;
   this.a = a; //This should be a decimal a ranging from 0 to 1
   if(this.a === undefined) this.a = 1;
}

Color.prototype.ToArray = function(expandedAlpha)
{
   return [this.r, this.g, this.b, this.a * (expandedAlpha ? 255 : 1)];
};

Color.prototype.ToRGBString = function()
{
   var pre = "rgb";
   var vars = this.r + "," + this.g + "," + this.b;
   if(this.a !== 1)
   {
      pre += "a";
      vars += "," + this.a;
   }
   return pre + "(" + vars + ")";
};

Color.prototype.ToHexString = function(includeAlpha)
{
   var string = "#" + this.r.toString(16).padStart(2, "0") + 
      this.g.toString(16).padStart(2, "0") + 
      this.b.toString(16).padStart(2, "0");

   if(includeAlpha)
      string += (255 * this.a).toString(16).padStart(2, "0");

   return string;
};

//Find the maximum difference between the channels of two colors.
Color.prototype.MaxDifference = function(compareColor)
{
   return Math.max(
      Math.abs(this.r - compareColor.r), 
      Math.abs(this.g - compareColor.g), 
      Math.abs(this.b - compareColor.b), 
      Math.abs(this.a - compareColor.a) * 255);
};

// --- StyleUtilities ---
// Functions for working with styles and colors. Some of these may have a poor
// runtime

var StyleUtilities =
{
   _cContext : document.createElement("canvas").getContext("2d"),
   GetColor : function(input) 
   {
      this._cContext.clearRect(0,0,1,1);
      this._cContext.fillStyle = input;
      this._cContext.fillRect(0,0,1,1);
      var data = this._cContext.getImageData(0,0,1,1).data;
      return new Color(data[0], data[1], data[2], data[3] / 255);
   },
   _GetColorMath : function(f, func)
   {
      var arr = [0,0,0];
      func(f, arr);
      return new Color(255 * arr[0], 255 * arr[1], 255 * arr[2], 1);
   },
   GetGray : function(f)
   {
      return StyleUtilities._GetColorMath(f, MathUtilities.Color.SetGray);
   },
   GetRGB : function(f)
   {
      return StyleUtilities._GetColorMath(f, MathUtilities.Color.SetRGB);
   },
   GetHue : function(f)
   {
      return StyleUtilities._GetColorMath(f, MathUtilities.Color.SetHue);
   },
   //Create a style element WITHOUT inserting it into the head. The given ID
   //will be set. The style element returned will have extra functionality
   //attached to it for easy style appending.
   CreateStyleElement : function(id) 
   {
      var mStyle = document.createElement("style");
      mStyle.appendChild(document.createTextNode(""));
      mStyle.nextInsert = 0;
      mStyle.Append = function(selectors, rules)
      {
         var i, finalSelectors = [];
         if(!TypeUtilities.IsArray(selectors)) selectors = [ selectors ];
         if(!TypeUtilities.IsArray(rules)) rules = [ rules ];
         for(i = 0; i < selectors.length; i++)
         {
            if(!TypeUtilities.IsArray(selectors[i])) selectors[i] = [ selectors[i] ];
            finalSelectors.push(selectors[i].join(" "));
         }
         mStyle.sheet.insertRule(
            finalSelectors.join(",") + "{" + rules.join(";") + "}", mStyle.nextInsert++);
      };
      mStyle.AppendClasses = function(classnames, rules)
      {
         var i, j;
         if(!TypeUtilities.IsArray(classnames)) classnames = [ classnames ];
         for(i = 0; i < classnames.length; i++)
         {
            if(!TypeUtilities.IsArray(classnames[i])) classnames[i] = [ classnames[i] ];
            for(j = 0; j < classnames[i].length; j++)
               classnames[i][j] = "." + classnames[i][j];
         }
         mStyle.Append(classnames, rules);
      };
      if(id) mStyle.id = id;
      return mStyle;
   },
   InsertStylesAtTop : function(styles)
   {
      if(!TypeUtilities.IsArray(styles)) styles = [ styles ];
      for(var i = styles.length - 1; i >= 0; i--)
         document.head.insertBefore(styles[i], document.head.firstChild);
   },
   TrySingleStyle : function(id)
   {
      if(document.getElementById(id))
         return false;

      var s = StyleUtilities.CreateStyleElement(id);
      StyleUtilities.InsertStylesAtTop(s);
      return s;
   },
   //Converts width and height into the true width and height on the device (or
   //as close to it, anyway). Usefull mostly for canvases.
   GetTrueRect : function(element)
   {
      window.devicePixelRatio = window.devicePixelRatio || 1;
      var pixelRatio = 1;
      var rect = element.getBoundingClientRect();
      rect.width = (Math.round(pixelRatio * rect.right) - Math.round(pixelRatio * rect.left)) / 
         window.devicePixelRatio; 
      rect.height = (Math.round(pixelRatio * rect.bottom) - Math.round(pixelRatio * rect.top)) / 
         window.devicePixelRatio; 
      return rect;
   },
   NoImageInterpolationRules : function()
   {
      return ["image-rendering:moz-crisp-edges","image-rendering:crisp-edges",
         "image-rendering:optimizespeed","image-rendering:pixelated"];
   }
};

StyleUtilities._cContext.canvas.width = StyleUtilities._cContext.canvas.height = 1;

// --- CanvasUtilities ---
// Helper functions for dealing with Canvases.

var CanvasUtilities =
{
   //WARNING! This function breaks canvases without a style set width or height 
   //on devices with a higher devicePixelRatio than 1 O_O
   AutoSize : function(canvas)
   {
      var rect = StyleUtilities.GetTrueRect(canvas);
      canvas.width = rect.width; 
      canvas.height = rect.height; 
   },
   //Basically the opposite of autosize: sets the style to match the canvas
   //size.
   AutoStyle : function(canvas)
   {
      canvas.style.width = canvas.width + "px";
      canvas.style.height = canvas.height + "px";
   },
   GetScaling : function(canvas)
   {
      var rect = StyleUtilities.GetTrueRect(canvas);
      return [rect.width / canvas.width, rect.height / canvas.height];
   },
   //Set scaling of canvas. Alternatively, set the scaling of the given element
   //(canvas will remain unaffected)
   SetScaling : function(canvas, scale, element)
   {
      if(!TypeUtilities.IsArray(scale)) scale = [scale, scale];
      var oldWidth = canvas.style.width;
      var oldHeight = canvas.style.height;
      canvas.style.width = canvas.width + "px";
      canvas.style.height = canvas.height + "px";
      var rect = StyleUtilities.GetTrueRect(canvas);
      if(element)
      {
         canvas.style.width = oldWidth || "";
         canvas.style.height = oldHeight || "";
      }
      else
      {
         element = canvas;
      }
      element.style.width = (rect.width * scale[0]) + "px";
      element.style.height = (rect.height * scale[1]) + "px";
   },
   CreateCopy : function(canvas, copyImage, x, y, width, height)
   {
      //Width and height are cropping, not scaling. X and Y are the place to
      //start the copy within the original canvas 
      x = x || 0; y = y || 0;
      if(width === undefined) width = canvas.width;
      if(height === undefined) height = canvas.height;
      var newCanvas = document.createElement("canvas");
      newCanvas.width = width;
      newCanvas.height = height;
      if(copyImage) CanvasUtilities.CopyInto(newCanvas.getContext("2d"), canvas, -x, -y);
      return newCanvas;
   },
   CopyInto : function(context, canvas, x, y)
   {
      //x and y are the offset locations to place the copy into on the
      //receiving canvas
      x = x || 0; y = y || 0;
      var oldComposition = context.globalCompositeOperation;
      context.globalCompositeOperation = "copy";
      CanvasUtilities.OptimizedDrawImage(context, canvas, x, y);
      context.globalCompositeOperation = oldComposition;
   },
   OptimizedDrawImage : function(context, image, x, y, scaleX, scaleY)
   {
      scaleX = scaleX || image.width;
      scaleY = scaleY || image.height;
      var oldImageSmoothing = context.imageSmoothingEnabled;
      context.imageSmoothingEnabled = false;
      context.drawImage(image, Math.floor(x), Math.floor(y), Math.floor(scaleX), Math.floor(scaleY));
      context.imageSmoothingEnabled = oldImageSmoothing;
   },
   Clear : function(canvas, color)
   {
      var context = canvas.getContext("2d");
      var oldStyle = context.fillStyle;
      var oldAlpha = context.globalAlpha;
      if(color)
      {
         context.globalAlpha = 1;
         context.fillStyle = color; 
         context.fillRect(0, 0, canvas.width, canvas.height);
      }
      else
      {
         context.clearRect(0, 0, canvas.width, canvas.height);
      }
      context.fillStyle = oldStyle;
      context.globalAlpha = oldAlpha;
   },
   DrawSolidCenteredRectangle : function(ctx, cx, cy, width, height, clear)
   {
      cx = Math.round(cx - width / 2);
      cy = Math.round(cy - height / 2);
      if(clear)
         ctx.clearRect(cx, cy, Math.round(width), Math.round(height));
      else
         ctx.fillRect(cx, cy, Math.round(width), Math.round(height));
      //The bounding rectangle for the area that was updated on the canvas.
      return [cx, cy, width, height];
   },
   DrawSolidEllipse: function(ctx, cx, cy, radius1, radius2, clear)
   {
      radius2 = radius2 || radius1;
      var line = clear ? "clearRect" : "fillRect";
      var rs1 = radius1 * radius1;
      var rs2 = radius2 * radius2;
      var rss = rs1 * rs2;
      var x, y;
      cx -= 0.5; //A HACK OOPS
      cy -= 0.5;

      for(y = -radius2 + 0.5; y <= radius2 - 0.5; y++)
      {
         for(x = -radius1 + 0.5; x <= radius1 - 0.5; x++)
         {
            if(x*x*rs2+y*y*rs1 <= rss)
            {
               ctx[line](Math.round(cx+x),Math.round(cy+y),Math.round(-x*2 + 0.5),1); 
               break;
            }
         }
      }

      return [cx - radius1, cy - radius2, radius1 * 2, radius2 * 2];
   },
   DrawNormalCenteredRectangle : function(ctx, cx, cy, width, height)//, clear)
   {
      cx = cx - (width - 1) / 2;
      cy = cy - (height - 1) / 2;

      ctx.fillRect(cx, cy, width, height);

      //The bounding rectangle for the area that was updated on the canvas.
      return [cx, cy, width, height];
   },
   //For now, doesn't actually draw an ellipse
   DrawNormalCenteredEllipse: function(ctx, cx, cy, width, height)//, clear)
   {
      ctx.beginPath();
      ctx.arc(cx, cy, width / 2, 0, Math.PI * 2, 0);
      ctx.fill();

      //The bounding rectangle for the area that was updated on the canvas.
      return [cx - width / 2 - 1, cy - height / 2 - 1, width, width];
   },
   //Wraps the given "normal eraser" function in the necessary crap to get the
   //eraser to function properly. Then you just have to fill wherever necessary.
   PerformNormalEraser : function(ctx, func)
   {
      var oldStyle = ctx.fillStyle;
      var oldComposition = ctx.globalCompositeOperation;
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.globalCompositeOperation = "destination-out";
      var result = func();
      ctx.fillStyle = oldStyle;
      ctx.globalCompositeOperation = oldComposition;
      return result;
   },
   //Draws a general line using the given function to generate each point.
   DrawLineRaw : function(ctx, sx, sy, tx, ty, width, clear, func)
   {
      var dist = MathUtilities.Distance(sx,sy,tx,ty);     // length of line
      var ang = MathUtilities.SlopeAngle(tx-sx,ty-sy);    // angle of line
      if(dist === 0) dist=0.001;
      for(var i=0;i<dist;i+=0.5) 
      {
         func(ctx, sx+Math.cos(ang)*i, sy+Math.sin(ang)*i, width, clear);
      }
      //This is just an approximation and will most likely be larger than
      //necessary. It is the bounding rectangle for the area that was updated
      return CanvasUtilities.ComputeBoundingBox(sx, sy, tx, ty, width);
   },
   //How to draw a single point on the SolidSquare line
   _DrawSolidSquareLineFunc : function(ctx, x, y, width, clear)
   { 
      CanvasUtilities.DrawSolidCenteredRectangle(ctx, x, y, width, width, clear); 
   },
   DrawSolidSquareLine : function(ctx, sx, sy, tx, ty, width, clear)
   {
      return CanvasUtilities.DrawLineRaw(ctx, sx, sy, tx, ty, width, clear,
         CanvasUtilities._DrawSolidSquareLineFunc);
   },
   //How to draw a single point on the SolidRound line
   _DrawSolidRoundLineFunc : function(ctx, x, y, width, clear)
   { 
      CanvasUtilities.DrawSolidEllipse(ctx, x, y, width / 2, width / 2, clear); 
   },
   DrawSolidRoundLine : function(ctx, sx, sy, tx, ty, width, clear)
   {
      return CanvasUtilities.DrawLineRaw(ctx, sx, sy, tx, ty, width, clear,
         CanvasUtilities._DrawSolidRoundLineFunc);
   },
   //How to draw a single point on the NormalSquare line
   _DrawNormalSquareLineFunc : function(ctx, x, y, width, clear)
   { 
      CanvasUtilities.DrawNormalCenteredRectangle(ctx, x, y, width, width, clear); 
   },
   DrawNormalSquareLine : function(ctx, sx, sy, tx, ty, width, clear)
   {
      if(clear)
      {
         return CanvasUtilities.PerformNormalEraser(ctx, function()
         {
            return CanvasUtilities.DrawLineRaw(ctx, sx, sy, tx, ty, width, false,
               CanvasUtilities._DrawNormalSquareLineFunc);
         });
      }
      else
      {
         return CanvasUtilities.DrawLineRaw(ctx, sx, sy, tx, ty, width, false,
            CanvasUtilities._DrawNormalSquareLineFunc);
      }
   },
   //How to draw a single point on the NormalRound line
   _DrawNormalRoundLineFunc : function(ctx, x, y, width, clear)
   { 
      CanvasUtilities.DrawNormalCenteredEllipse(ctx, x, y, width, width, clear); 
   },
   DrawNormalRoundLine : function(ctx, sx, sy, tx, ty, width, clear)
   {
      if(clear)
      {
         return CanvasUtilities.PerformNormalEraser(ctx, function()
         {
            return CanvasUtilities.DrawLineRaw(ctx, sx, sy, tx, ty, width, false,
               CanvasUtilities._DrawNormalRoundLineFunc);
         });
      }
      else
      {
         return CanvasUtilities.DrawLineRaw(ctx, sx, sy, tx, ty, width, false,
            CanvasUtilities._DrawNormalRoundLineFunc);
      }
   },
   DrawHollowRectangle : function(ctx, x, y, x2, y2, width)
   {
      CanvasUtilities.DrawSolidSquareLine(ctx, x, y, x2, y, width);
      CanvasUtilities.DrawSolidSquareLine(ctx, x, y2, x2, y2, width);
      CanvasUtilities.DrawSolidSquareLine(ctx, x, y, x, y2, width);
      CanvasUtilities.DrawSolidSquareLine(ctx, x2, y, x2, y2, width);
      return CanvasUtilities.ComputeBoundingBox(x, y, x2, y2, width);
   },
   ComputeBoundingBox : function(x, y, x2, y2, width)
   {
      return [Math.min(x, x2) - width, Math.min(y, y2) - width,
              Math.abs(x - x2) + width * 2 + 1, Math.abs(y - y2) + width * 2 + 1];
   },
   ComputeTotalBoundingBox : function(boxes)
   {
      var finalBox = [ Infinity, Infinity, -Infinity, -Infinity];

      for(var i = 0; i < boxes.length; i++)
      {
         if(!boxes[i] || boxes[i].length < 4) return false;
         finalBox[0] = Math.min(boxes[0], finalBox[0]);
         finalBox[1] = Math.min(boxes[1], finalBox[1]);
         finalBox[2] = Math.max(boxes[0] + boxes[2], finalBox[2]);
         finalBox[3] = Math.max(boxes[1] + boxes[3], finalBox[3]);
      }

      return finalBox;
   },
   GetColor : function(context, x, y)
   {
      var data = context.getImageData(x, y, 1, 1).data;
      return new Color(data[0], data[1], data[2], data[3] / 255);
   },
   GetColorFromData : function(data, i)
   {
      return new Color(data[i], data[i+1], data[i+2], data[i+3]/255);
   },
   //PutColorInData : function(color, data, i)
   //{
   //   var array = color.ToArray(true);
   //   for(var i = 0; i < 
   //},
   //Convert x and y into an ImageDataCoordinate. Returns -1 if the coordinate
   //falls outside the canvas.
   ImageDataCoordinate : function(context, x, y)
   {
      if(x < 0 || x >= context.canvas.width || y < 0 || y > context.canvas.height) return -1;
      return 4 * (x + y * context.canvas.width);
   },
   GenericFlood : function(context, x, y, floodFunction)
   {
      x = Math.floor(x); y = Math.floor(y);
      var canvas = context.canvas; 
      var iData = context.getImageData(0, 0, canvas.width, canvas.height);
      var data = iData.data;
      var queueX = [], queueY = []; 
      var west, east, row, column;
      var enqueue = function(qx, qy) { queueX.push(qx); queueY.push(qy); };
      if(floodFunction(context, x, y, data)) enqueue(x, y);
      while(queueX.length)
      {
         column = queueX.shift();
         row = queueY.shift();
         //Move west until it is just outside the range we want to fill. Move
         //east in a similar manner.
         for(west = column - 1; west >= -1 && floodFunction(context, west, row, data); west--);
         for(east = column + 1; east <= canvas.width && floodFunction(context, east, row, data); east++);
         //Move from west to east EXCLUSIVE and fill the queue with matching
         //north and south nodes.
         for(column = west + 1; column < east; column++)
         {
            if(row + 1 < canvas.height && floodFunction(context, column, row + 1, data))
               enqueue(column, row + 1);
            if(row - 1 >= 0 && floodFunction(context, column, row - 1, data))
               enqueue(column, row - 1);
         }
      }
      context.putImageData(iData, 0, 0);
   },
   FloodFill : function(context, sx, sy, color, threshold)
   {
      sx = Math.floor(sx); sy = Math.floor(sy);
      console.debug("Flood filling starting from " + sx + ", " + sy);
      threshold = threshold || 0;
      var originalColor = CanvasUtilities.GetColor(context, sx, sy);
      var ocolorArray = originalColor.ToArray(true);
      var colorArray = color.ToArray(true);
      if(color.MaxDifference(originalColor) <= threshold) return; 
      var floodFunction = function(c, x, y, d)
      {
         var i = CanvasUtilities.ImageDataCoordinate(c, x, y);
         var currentColor = new Color(d[i], d[i+1], d[i+2], d[i+3]/255);
         if(originalColor.MaxDifference(currentColor) <= threshold)
         {
            for(var j = 0; j < 4; j++)
               d[i + j] = colorArray[j];
            return true;
         }
         else
         {
            return false;
         }
      };
      CanvasUtilities.GenericFlood(context, sx, sy, floodFunction);
   },
   SwapColor : function(context, original, newColor, threshold)
   {
      var canvas = context.canvas;
      var iData = context.getImageData(0, 0, canvas.width, canvas.height);
      var data = iData.data;
      var newArray = newColor.ToArray(true);
      var i, j;

      for(i = 0; i < data.length; i+=4)
      {
         var cCol = CanvasUtilities.GetColorFromData(data, i);

         if(cCol.MaxDifference(original) <= threshold)
         {
            for(j = 0; j < 4; j++)
               data[i+j] = newArray[j];
         }
      }

      context.putImageData(iData, 0, 0);
   },
   ToString : function(canvas)
   {
      return canvas.toDataURL("image/png");
   },
   FromString : function(string)
   {
      var canvas = document.createElement("canvas");
      var image = new Image();
      image.addEventListener("load", function(e)
      {
         canvas.width = image.width;
         canvas.height = image.height;
         canvas.getContext("2d").drawImage(image, 0, 0);
      });
      image.src = string;
      return canvas;
   },
   //Draw the image from a data url into the given canvas.
   DrawDataURL : function(string, canvas, x, y, callback)
   {
      x = x || 0;
      y = y || 0;
      var image = new Image();
      image.addEventListener("load", function(e)
      {
         canvas.getContext("2d").drawImage(image, x, y);
         if(callback) callback(canvas, image);
      });
      image.src = string;
   }
};

// --- Event Utilities ---
// Functions to help with built-in events (such as the mouse event).

var EventUtilities =
{
   SignalCodes : { Cancel : 2, Run : 1, Wait : 0},
   mButtonMap : [ 1, 4, 2, 8, 16 ],
   MouseButtonToButtons : function(button)
   {
      return EventUtilities.mButtonMap[button];
   },
   //This is a NON-BLOCKING function that simply "schedules" the function to be
   //performed later if the signal is in the "WAIT" phase.
   ScheduleWaitingTask: function(signal, perform, interval)
   {
      interval = interval || 100;
      var s = signal();
      if(s === EventUtilities.SignalCodes.Cancel)
         return;
      else if(s === EventUtilities.SignalCodes.Run)
         perform();
      else
         window.setTimeout(function() { EventUtilities.ScheduleWaitingTask(signal, perform, interval);}, interval);
   }
};

// --- Screen Utilities ---
// Functions to help with setting up or altering the screen (such as fullscreen
// elements and whatever)

var ScreenUtilities = 
{
   LaunchIntoFullscreen : function(element) 
   {
      if(element.requestFullscreen)
         element.requestFullscreen();
      else if(element.mozRequestFullScreen)
         element.mozRequestFullScreen();
      else if(element.webkitRequestFullscreen)
         element.webkitRequestFullscreen();
      else if(element.msRequestFullscreen)
         element.msRequestFullscreen();

      //Keep the UXUtilities INSIDE the fullscreen thingy.
      element.appendChild(UXUtilities.UtilitiesContainer);
   },
   ExitFullscreen : function() 
   {
      if(document.exitFullscreen)
         document.exitFullscreen();
      else if(document.mozCancelFullScreen)
         document.mozCancelFullScreen();
      else if(document.webkitExitFullscreen)
         document.webkitExitFullscreen();
         
      //Replace the utilities back into the body.
      document.body.appendChild(UXUtilities.UtilitiesContainer);
   },
   IsFullscreen : function()
   {
      if(document.fullscreenElement || document.mozFullScreenElement ||
         document.webkitFullscreenElement)
         return true;

      return false;
   }
};

// --- Math Utilities ---
// Functions which provide extra math functionality.

var MathUtilities =
{
   Distance : function(x1, y1, x2, y2)
   {
      return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
   },
   Midpoint : function(x1, y1, x2, y2)
   {
      return [x1 + (x2 - x1) / 2, y1 + (y2 - y1) / 2];
   },
   MinMax : function(value, min, max)
   {
      if(min > max)
      {
         var temp = min;
         min = max;
         max = temp;
      }
      return  Math.max(Math.min(value, max), min);
   },
   SlopeAngle : function(x,y) 
   { 
      return Math.atan(y/(x===0?0.0001:x))+(x<0?Math.PI:0); 
   },
   IntRandom : function(max, min)
   {
      min = min || 0; //getOrDefault(min, 0);

      if(min > max)
      {
         var temp = min;
         min = max;
         max = temp;
      }

      return Math.floor((Math.random() * (max - min)) + min);
   },
   LinearInterpolate : function(y1, y2, mu)
   {
      return y1 + mu * (y2 - y1);
   },
   CosInterpolate : function (y1, y2, mu)
   {
      var mu2 = (1 - Math.cos(mu * Math.PI)) / 2;
      return (y1* (1 - mu2) + y2 * mu2);
   },
   NewGuid : function() 
   {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c)
      {
         return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
      });
   },
   GetSquare : function(x, y, x2, y2)
   {
      return [Math.min(x, x2), Math.min(y, y2), Math.abs(x - x2), Math.abs(y - y2)];
   },
   IsPointInSquare : function(point, square)
   {
      return point[0] >= square[0] && point[0] <= square[0] + square[2] &&
         point[1] >= square[1] && point[1] <= square[1] + square[3];
   },
   Color : 
   {
      SetGray : function(f, arr)
      {
         arr[0] = f;
         arr[1] = f;
         arr[2] = f;
      },
      SetRGB : function(f, arr)
      {
         //Duplicate code but fewer branches
         if(f < 0.5)
         {
            arr[0] = 1 - 2 * f;
            arr[2] = 0;
         }
         else
         {
            arr[0] = 0;
            arr[2] = 2 * f - 1;
         }
         arr[1] = 1 - Math.abs(f * 2 - 1);
      },
      SetHue : function(f, arr)
      {
         if(f < 1 / 6)
         {
            arr[0] = 1;
            arr[1] = f * 6;
            arr[2] = 0;
         }
         else if(f < 2 / 6)
         {
            arr[0] = 1 - (f - 1 / 6) * 6;
            arr[1] = 1;
            arr[2] = 0;
         }
         else if(f < 0.5)
         {
            arr[0] = 0;
            arr[1] = 1;
            arr[2] = (f - 2 / 6) * 6;
         }
         else if(f < 4 / 6)
         {
            arr[0] = 0;
            arr[1] = 1 - (f - 0.5) * 6;
            arr[2] = 1;
         }
         else if(f < 5 / 6)
         {
            arr[0] = (f - 4 / 6) * 6;
            arr[1] = 0;
            arr[2] = 1;
         }
         else
         {
            arr[0] = 1;
            arr[1] = 0;
            arr[2] = 1 - (f - 5 / 6) * 6;
         }
      }
   }
};

// --- Date Utilities ---
// Functions for working with and converting dates

var DateUtilities = 
{
   LocaleDateString : function(separator, date)
   {
      date = date || new Date();

      if(separator) 
         return date.toLocaleDateString().replace(/\//g, separator);
      else
         return date.toLocaleDateString();
   }
};

// --- Array Utilities ---

var ArrayUtilities =
{
   Contains : function(array, item)
   {
      return ArrayUtilities.Any(array, function(x) { return x === item; });
   },
   Where : function(array, check)
   {
      var result = [];
      for(var i = 0; i < array.length; i++)
         if(check(array[i], i))
            result.push(array[i]);
      return result;
   },
   Any : function(array, check)
   {
      for(var i = 0; i < array.length; i++)
         if(check(array[i], i))
            return true;

      return false;
   }
};

// --- UndoBuffer ---
// Basically all undo buffers work the same, so here's a generic object you can
// use for all your undo needs

function UndoBuffer(maxSize, maxVirtualIndex)
{
   this.maxSize = maxSize || 5;
   this.maxVirtualIndex = maxVirtualIndex || this.maxSize;
   this.Clear();
}

UndoBuffer.prototype.Clear = function()
{
   this.undoBuffer = [];
   this.redoBuffer = [];
   this.virtualIndex = 0;
};

UndoBuffer.prototype._ShiftVirtualIndex = function(amount)
{
   this.virtualIndex += amount; 
   while(this.virtualIndex < 0) this.virtualIndex += this.maxVirtualIndex;
   this.virtualIndex = this.virtualIndex % this.maxVirtualIndex;
};

UndoBuffer.prototype.UndoCount = function() { return this.undoBuffer.length; };
UndoBuffer.prototype.RedoCount = function() { return this.redoBuffer.length; };

UndoBuffer.prototype.Add = function(currentState)
{
   this.undoBuffer.push(currentState);
   this.redoBuffer = [];
   this._ShiftVirtualIndex(1);
   while(this.undoBuffer.length > this.maxSize)
      this.undoBuffer.shift();
   return this.UndoCount();
};

UndoBuffer.prototype.Undo = function(currentState)
{
   if(this.UndoCount() <= 0) return;
   this.redoBuffer.push(currentState);
   this._ShiftVirtualIndex(-1);
   return this.undoBuffer.pop();
};

UndoBuffer.prototype.Redo = function(currentState)
{
   if(this.RedoCount() <= 0) return;
   this.undoBuffer.push(currentState);
   this._ShiftVirtualIndex(1);
   return this.redoBuffer.pop();
};

UndoBuffer.prototype.ClearRedos = function()
{
   this.redoBuffer = [];
};

// --- CodeTester ---
// An easy way to run unit tests. Just create this object then fire away the
// RunAll function!

function CodeTester(element, tests)
{
   this.element = element;
   this.tests = tests;
   this.stopOnFailure = false;
}

CodeTester.prototype.Test = function(test, expectedValue)
{
   var testElement = document.createElement("p");
   var testCode = document.createElement("span");
   var result = document.createElement("span");
   var extra = document.createElement("span");
   testCode.className = "testcode";
   testCode.innerHTML = test;
   result.className = "result";
   extra.className = "extra";

   try
   {
      /* jshint ignore: start */
      var testResult = eval(test);
      var success = false;

      if(expectedValue !== undefined)
      {
         testCode.innerHTML += " === " + expectedValue;   
         success = testResult === eval(expectedValue);
      }
      else
      {
         success = testResult;
      }
      /* jshint ignore : end */

      if(success)
      {
         result.innerHTML = "[OK]";
         result.className += " success";
      }
      else
      {
         throw "returned " + testResult;
      }
   }
   catch(ex)
   {
      result.innerHTML = "[FAIL]";
      result.className += " failure";
      extra.innerHTML = "(" + ex + ")";
   }

   testElement.appendChild(testCode);
   testElement.appendChild(result);
   testElement.appendChild(extra);

   return testElement;
};

CodeTester.prototype.RunAll = function(fillElement, tests, stopOnFailure)
{
   var failures = 0;
   fillElement = fillElement || this.element;
   tests= tests || this.tests;
   stopOnFailure = stopOnFailure || this.stopOnFailure;

   for(var i = 0; i < tests.length; i++)
   {
      var resultElement;

      if(tests[i].indexOf("/") === 0)
      {
         resultElement = this.Test(tests[i].slice(1), tests[i + 1]);
         i++;
      }
      else
      {
         resultElement = this.Test(tests[i]);
      }

      fillElement.appendChild(resultElement);
      if(resultElement.querySelector(".failure"))
      {
         failures++;
         if(stopOnFailure) return;
      }
   }

   return failures;
};

// --- ConsoleEmulator ---
// Allows you to create a console-like system that performs output and input.
// You can attach logging to it to allow console logs to be seen on systems
// without dev tools or inspection.

function ConsoleEmulator()
{
   this.OnRead = false;
   this.OnReadChar = false;
   this.rawConsole = false;
   this.inputBuffer = false;
   this.cursor = false;
   var me = this;

   this.keyPress = function(e)
   {
      if(!e.key || e.key.length > 1) return;

      me.inputBuffer.textContent += e.key;
      if(me.OnReadChar) me.OnReadChar(e.key);
      me.FixFloatingObjects();
   };
   this.keyDown = function(e)
   {
      if(e.keyCode === 8 && me.inputBuffer.textContent.length > 0)
      {
         me.inputBuffer.textContent = me.inputBuffer.textContent.substring(0, 
            me.inputBuffer.textContent.length - 1);
      }
      else if(e.keyCode === 13 && me.inputBuffer.textContent.length > 0)
      {
         if(me.OnRead) me.OnRead(me.inputBuffer.textContent);
         me.WriteLine(me.inputBuffer.textContent);
         me.inputBuffer.textContent = "";
      }
   };
}

ConsoleEmulator.ClassName = "consoleEmulator";
ConsoleEmulator.CursorClassName = "cursor";
ConsoleEmulator.StyleID = HTMLUtilities.GetUniqueID("consoleEmulatorStyle");

ConsoleEmulator.prototype.TrySetDefaultStyles = function()
{
   if(document.getElementById(ConsoleEmulator.StyleID))
      return;

   console.log("Setting up ConsoleEmulator default styles for the first time");

   var style = document.createElement("style");
   style.appendChild(document.createTextNode(""));
   style.id = ConsoleEmulator.StyleID;
   document.head.insertBefore(style, document.head.firstChild);
   style.sheet.insertRule(".consoleEmulator { font-family: monospace; " +
      "font-size: 12px; height: 30em; width: 45.5em; background-color: #222; " +
      "color: #CCC; display: block; word-wrap: break-word; overflow: hidden; " +
      "white-space: pre-wrap; padding: 1px; overflow-y: scroll; }", 0);
   style.sheet.insertRule(".consoleEmulator .cursor { color: limegreen; " +
      "/*animation: 1s blink step-end infinite;*/ } ", 1);
   style.sheet.insertRule(".consoleEmulator .input { color: #EEE; }", 2);
   style.sheet.insertRule(".consoleEmulator .red { color: red; }", 3);
   style.sheet.insertRule(".consoleEmulator .blue { color: blue; }", 4);
   style.sheet.insertRule(".consoleEmulator .green { color: green; }", 5);
   style.sheet.insertRule(".consoleEmulator .yellow { color: yellow; }", 6);
   style.sheet.insertRule(".consoleEmulator .purple { color: purple; }", 7);
};

ConsoleEmulator.prototype.FixFloatingObjects = function()
{
   HTMLUtilities.MoveToEnd(this.inputBuffer);
   HTMLUtilities.MoveToEnd(this.cursor);
};

ConsoleEmulator.prototype.Write = function(output, color)
{
   var outputWrapper = document.createElement("span");
   outputWrapper.innerHTML = output;
   if(color) outputWrapper.className = color;
   this.rawConsole.appendChild(outputWrapper);
   this.FixFloatingObjects();
};

ConsoleEmulator.prototype.WriteLine = function(output, color)
{
   this.Write(output + "\n", color);
};

ConsoleEmulator.prototype.Generate = function()
{
   this.inputBuffer = document.createElement("span");
   this.inputBuffer.className = "input";

   this.cursor = document.createElement("span");
   this.cursor.className = ConsoleEmulator.CursorClassName;
   this.cursor.innerHTML = "█";

   this.rawConsole = document.createElement("div");
   this.rawConsole.className = ConsoleEmulator.ClassName;
   this.rawConsole.addEventListener("keypress", this.keyPress);
   this.rawConsole.addEventListener("keydown", this.keyDown);
   this.rawConsole.setAttribute("tabindex", "-1");

   this.rawConsole.appendChild(this.inputBuffer);
   this.rawConsole.appendChild(this.cursor);

   this.TrySetDefaultStyles();

   return this.rawConsole;
};

//WARNING: this captures the ConsoleEmulator object and elements. It cannot be
//detached or undone. Sorry!
ConsoleEmulator.prototype.SetAsConsoleLog = function(colored)
{
   var log = console.log;
   var debug = console.debug;
   var trace = console.trace;
   var me = this;

   console.log = function(object) { log(object); me.WriteLine(object);};
   console.debug = function(object) { debug(object); me.WriteLine(object, colored ? "green": false);};
   console.trace = function(object) { trace(object); me.WriteLine(object, colored ? "blue": false);};
   console.debug("Attached console to ConsoleEmulator");
};

// --- ColorPicker ---
// A purely javascript color picker (so people on bad devices don't get stuck
// without a color picker).

//This is the Base64 library just copied directly into my script lol.
(function(global) {
    'use strict';
    // existing version for noConflict()
    var _Base64 = global.Base64;
    var version = "2.1.9";
    // if node.js, we use Buffer
    var buffer;
    if (typeof module !== 'undefined' && module.exports) {
        try {
            buffer = require('buffer').Buffer;
        } catch (err) {}
    }
    // constants
    var b64chars
        = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var b64tab = function(bin) {
        var t = {};
        for (var i = 0, l = bin.length; i < l; i++) t[bin.charAt(i)] = i;
        return t;
    }(b64chars);
    var fromCharCode = String.fromCharCode;
    // encoder stuff
    var cb_utob = function(c) {
         var cc;
        if (c.length < 2) {
            cc = c.charCodeAt(0);
            return cc < 0x80 ? c
                : cc < 0x800 ? (fromCharCode(0xc0 | (cc >>> 6)) + 
                  fromCharCode(0x80 | (cc & 0x3f)))
                : (fromCharCode(0xe0 | ((cc >>> 12) & 0x0f)) + 
                  fromCharCode(0x80 | ((cc >>>  6) & 0x3f)) + 
                  fromCharCode(0x80 | ( cc         & 0x3f)));
        } else {
            cc = 0x10000 + 
               (c.charCodeAt(0) - 0xD800) * 0x400 + 
               (c.charCodeAt(1) - 0xDC00);
            return (fromCharCode(0xf0 | ((cc >>> 18) & 0x07)) + 
               fromCharCode(0x80 | ((cc >>> 12) & 0x3f)) + 
               fromCharCode(0x80 | ((cc >>>  6) & 0x3f)) + 
               fromCharCode(0x80 | ( cc         & 0x3f)));
        }
    };
    var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
    var utob = function(u) {
        return u.replace(re_utob, cb_utob);
    };
    var cb_encode = function(ccc) {
        var padlen = [0, 2, 1][ccc.length % 3],
        ord = ccc.charCodeAt(0) << 16
            | ((ccc.length > 1 ? ccc.charCodeAt(1) : 0) << 8)
            | ((ccc.length > 2 ? ccc.charCodeAt(2) : 0)),
        chars = [
            b64chars.charAt( ord >>> 18),
            b64chars.charAt((ord >>> 12) & 63),
            padlen >= 2 ? '=' : b64chars.charAt((ord >>> 6) & 63),
            padlen >= 1 ? '=' : b64chars.charAt(ord & 63)
        ];
        return chars.join('');
    };
    var btoa = global.btoa ? function(b) {
        return global.btoa(b);
    } : function(b) {
        return b.replace(/[\s\S]{1,3}/g, cb_encode);
    };
    var _encode = buffer ? function (u) {
        return (u.constructor === buffer.constructor ? u : new buffer(u))
        .toString('base64');
    }
    : function (u) { return btoa(utob(u)); }
    ;
    var encode = function(u, urisafe) {
        return !urisafe ? 
            _encode(String(u)) : 
            _encode(String(u)).replace(/[+\/]/g, function(m0) {
                return m0 == '+' ? '-' : '_';
            }).replace(/=/g, '');
    };
    var encodeURI = function(u) { return encode(u, true); };
    // decoder stuff
    var re_btou = new RegExp([
        '[\xC0-\xDF][\x80-\xBF]',
        '[\xE0-\xEF][\x80-\xBF]{2}',
        '[\xF0-\xF7][\x80-\xBF]{3}'
    ].join('|'), 'g');
    var cb_btou = function(cccc) {
        switch(cccc.length) {
        case 4:
            var cp = ((0x07 & cccc.charCodeAt(0)) << 18)
                |    ((0x3f & cccc.charCodeAt(1)) << 12)
                |    ((0x3f & cccc.charCodeAt(2)) <<  6)
                |     (0x3f & cccc.charCodeAt(3)),
            offset = cp - 0x10000;
            return (fromCharCode((offset  >>> 10) + 0xD800) + 
               fromCharCode((offset & 0x3FF) + 0xDC00));
        case 3:
            return fromCharCode(
                ((0x0f & cccc.charCodeAt(0)) << 12)
                    | ((0x3f & cccc.charCodeAt(1)) << 6)
                    |  (0x3f & cccc.charCodeAt(2))
            );
        default:
            return  fromCharCode(
                ((0x1f & cccc.charCodeAt(0)) << 6)
                    |  (0x3f & cccc.charCodeAt(1))
            );
        }
    };
    var btou = function(b) {
        return b.replace(re_btou, cb_btou);
    };
    var cb_decode = function(cccc) {
        var len = cccc.length,
        padlen = len % 4,
        n = (len > 0 ? b64tab[cccc.charAt(0)] << 18 : 0)
            | (len > 1 ? b64tab[cccc.charAt(1)] << 12 : 0)
            | (len > 2 ? b64tab[cccc.charAt(2)] <<  6 : 0)
            | (len > 3 ? b64tab[cccc.charAt(3)]       : 0),
        chars = [
            fromCharCode( n >>> 16),
            fromCharCode((n >>>  8) & 0xff),
            fromCharCode( n         & 0xff)
        ];
        chars.length -= [0, 0, 2, 1][padlen];
        return chars.join('');
    };
    var atob = global.atob ? function(a) {
        return global.atob(a);
    } : function(a){
        return a.replace(/[\s\S]{1,4}/g, cb_decode);
    };
    var _decode = buffer ? function(a) {
        return (a.constructor === buffer.constructor ? 
            a : new buffer(a, 'base64')).toString();
    }
    : function(a) { return btou(atob(a)); };
    var decode = function(a){
        return _decode(
            String(a).replace(/[-_]/g, function(m0) { return m0 == '-' ? '+' : '/'; })
                .replace(/[^A-Za-z0-9\+\/]/g, '')
        );
    };
    var noConflict = function() {
        var Base64 = global.Base64;
        global.Base64 = _Base64;
        return Base64;
    };
    // export Base64
    global.Base64 = {
        VERSION: version,
        atob: atob,
        btoa: btoa,
        fromBase64: decode,
        toBase64: encode,
        utob: utob,
        encode: encode,
        encodeURI: encodeURI,
        btou: btou,
        decode: decode,
        noConflict: noConflict
    };
    // if ES5 is available, make Base64.extendString() available
    if (typeof Object.defineProperty === 'function') {
        var noEnum = function(v){
            return {value:v,enumerable:false,writable:true,configurable:true};
        };
        global.Base64.extendString = function () {
            Object.defineProperty(
                String.prototype, 'fromBase64', noEnum(function () {
                    return decode(this);
                }));
            Object.defineProperty(
                String.prototype, 'toBase64', noEnum(function (urisafe) {
                    return encode(this, urisafe);
                }));
            Object.defineProperty(
                String.prototype, 'toBase64URI', noEnum(function () {
                    return encode(this, true);
                }));
        };
    }
    // that's it!
    if (global.Meteor) {
       Base64 = global.Base64; // for normal export in Meteor.js
    }
})(this);


// -------------------------------------------------------
// -------------- RANDOMOUSCANVAS.JS ---------------------
// -------------------------------------------------------


// Carlos Sanchez - 2017
// randomouscrap98@aol.com
// An enormous library full of canvas garbage
// NOTE: THIS LIBRARY REQUIRES randomous.js!

// --- CursorActionData ---
// Auxiliary object for describing generic cursor actions and data. Useful for
// unified mouse/touch systems (like CanvasPerformer)

function CursorActionData(action, x, y, zoomDelta) 
{
   this.action = action;
   this.x = x;
   this.y = y;
   this.realX = x; //The real x and y relative to the canvas.
   this.realY = y;
   this.zoomDelta = zoomDelta || false;
   this.onTarget = true;
   this.targetElement = false;
   this.time = 0; //Date.now();
   this.modifiers = 0;
}

CursorActions = 
{
   Start : 1, End : 2, Drag : 4, Zoom : 8, Pan : 16, Interrupt : 32
};

CursorModifiers = 
{
   Ctrl : 1, Alt : 2
};

// --- CanvasPerformer ---
// Allows simple actions using unified touch and mouse on a canvas. Useful for
// drawing applications

function CanvasPerformer()
{
   this.DragButton = 1;
   this.PanButton = 2;
   this.DragTouches = 1;
   this.ZoomTouches = 2;
   this.PanTouches = 2;
   this.WheelZoom = 0.5;
   this.OnAction = false;

   this._canvas = false;
   this._oldStyle = {};

   var me = this;
   var lastMAction = 0;
   var lastTAction = 0;
   var startZDistance = 0;
   var lastZDistance = 0;
   var lastTPosition = [-1,-1];

   //Event for "mouse down". Creates a generic "cursor" action
   this._evMD = function(e)
   {
      console.trace("CanvasPerformer mouse down");
      var action = CursorActions.Start;
      var buttons = e.buttons || EventUtilities.MouseButtonToButtons(e.button);

      lastMAction = me.ButtonsToAction(buttons);
      me.Perform(e, new CursorActionData(action | lastMAction, e.clientX, e.clientY), me._canvas);
   };
   //Event for "mouse up". Creates a generic "cursor" action
   this._evMU = function(e)
   {
      console.trace("CanvasPerformer mouse up");
      me.Perform(e, new CursorActionData(CursorActions.End | lastMAction, e.clientX, e.clientY), me._canvas); 
      lastMAction = 0;
   };
   //Event for the "wheel". Creates a generic "cursor" action
   this._evMW = function(e)
   {
      me.Perform(e, new CursorActionData(CursorActions.Start | CursorActions.End | CursorActions.Zoom, 
         e.clientX, e.clientY, -Math.sign(e.deltaY) * me.WheelZoom), me._canvas);
   };
   //Event for both "touch start" and "touch end". Creates a generic "cursor" action
   //Event for "touch start". Creates a generic "cursor" action
   this._evTC = function(e)
   {
      console.trace("CanvasPerformer touch start/end event [" + e.touches.length + "]");
      if(me.ZoomTouches !== 2) throw "Zoom must use 2 fingers!"; 

      var extraAction = 0;
      var nextAction = me.TouchesToAction(e.touches.length);

      //If we enter evTC and there is a lastTAction, that means that last
      //action has ended. Either we went from 1 touch to 0 or maybe 2 touches
      //to 1 touch. Either way, that specific action has ended (2 touches is a
      //zoom, 1 touch is a drag, etc.).
      if(lastTAction)
      {
         if(nextAction) extraAction |= CursorActions.Interrupt;
         me.Perform(e, new CursorActionData(CursorActions.End | lastTAction | extraAction, 
            lastTPosition[0], lastTPosition[1]), me._canvas);
      }

      //Move to the "next" action.
      lastTAction = nextAction;

      //if the user is ACTUALLY performing something (and this isn't just a 0
      //touch event), THEN we're starting something here.
      if(lastTAction)
      {
         if(lastTAction & CursorActions.Zoom) 
         {
            startZDistance = me.PinchDistance(e.touches);
            lastZDistance = 0;
         }
         lastTPosition = me.TouchesToXY(lastTAction, e.touches);
         me.Perform(e, new CursorActionData(CursorActions.Start | lastTAction | extraAction, 
            lastTPosition[0], lastTPosition[1]), me._canvas);
      }
   };
   //Event for "mouse move". Creates a generic "cursor" action.
   this._evMM = function(e)
   {
      me.Perform(e, new CursorActionData(me.ButtonsToAction(e.buttons), e.clientX, e.clientY), me._canvas);
   };
   //Event for "touch move". Creates a generic "cursor" action.
   this._evTM = function(e)
   {
      var action = me.TouchesToAction(e.touches.length);
      lastTPosition = me.TouchesToXY(action, e.touches);

      if(action & CursorActions.Zoom)
      {
         var startZoomDiff = me.PinchZoom(me.PinchDistance(e.touches), startZDistance);
         me.Perform(e, new CursorActionData(action, lastTPosition[0], lastTPosition[1],
            startZoomDiff - lastZDistance), me._canvas);
         lastZDistance = startZoomDiff;
      }
      else
      {
         me.Perform(e, new CursorActionData(action, lastTPosition[0], lastTPosition[1]), me._canvas);
      }
   };
   this._evPrevent = function(e) { e.preventDefault(); };
}

CanvasPerformer.prototype.GetModifiedCursorData = function(data, e)
{
   if(!e) return data;
   if(e.ctrlKey) data.modifiers |= CursorModifiers.Ctrl;
   return data;
};

//Convert the "buttons" field of a mouse event to the appropriate action
CanvasPerformer.prototype.ButtonsToAction = function(buttons)
{
   if(buttons & this.DragButton)
      return CursorActions.Drag;
   else if(buttons & this.PanButton)
      return CursorActions.Pan;
};

//Convert the touch count to an appropriate action
CanvasPerformer.prototype.TouchesToAction = function(touches)
{
   var action = 0;

   if(touches === this.DragTouches)
      action = action | CursorActions.Drag;
   if(touches === this.ZoomTouches)
      action = action | CursorActions.Zoom;
   if(touches == this.PanTouches)
      action = action | CursorActions.Pan;

   return action;
};

//Convert a touch array into a certain XY position based on the given action.
CanvasPerformer.prototype.TouchesToXY = function(action, touchArray)
{
   if(action & CursorActions.Zoom)
   {
      return MathUtilities.Midpoint(touchArray[0].clientX, touchArray[0].clientY,
         touchArray[1].clientX, touchArray[1].clientY);
   }

   return [touchArray[0].clientX, touchArray[0].clientY];
};

//Figure out the distance of a pinch based on the given touches.
CanvasPerformer.prototype.PinchDistance = function(touchArray)
{
   return MathUtilities.Distance(touchArray[0].clientX, touchArray[0].clientY,
      touchArray[1].clientX, touchArray[1].clientY);
};

//Figure out the zoom difference (from the original) for a pinch. This is NOT
//the delta zoom between actions, just the delta zoom since the start of the
//pinch (or whatever is passed for oDistance)
CanvasPerformer.prototype.PinchZoom = function(distance, oDistance)
{
   return Math.log2(distance / oDistance);
};

//System uses this function to determine if touches should be captured. Users
//can override this function to give their own rules for captured touches.
//Capturing a touch prevents scrolling.
CanvasPerformer.prototype.ShouldCapture = function(data)
{
   return data.onTarget; //this._canvas && (this._canvas === document.activeElement);   
};

CanvasPerformer.prototype.Attach = function(canvas)
{
   if(this._canvas) throw "This CanvasPerformer is already attached to a canvas!";

   this._canvas = canvas;
   this._oldStyle = canvas.style.touchAction;
   
   canvas.style.touchAction = "none";
   document.addEventListener("mousedown", this._evMD);
   document.addEventListener("touchstart", this._evTC);
   canvas.addEventListener("touchstart", this._evPrevent); //Stops initial tuochmove distance cutoff
   canvas.addEventListener("wheel", this._evMW);
   canvas.addEventListener("contextmenu", this._evPrevent);
   document.addEventListener("mouseup", this._evMU); 
   document.addEventListener("touchend", this._evTC);
   document.addEventListener("touchcancel", this._evTC);
   document.addEventListener("mousemove", this._evMM);
   document.addEventListener("touchmove", this._evTM);
};

CanvasPerformer.prototype.Detach = function()
{
   if(!this._canvas) throw "This CanvasPerformer is is not attached to a canvas!";

   document.removeEventListener("mousedown", this._evMD);
   document.removeEventListener("touchstart", this._evTC);
   canvas.removeEventListener("wheel", this._evMW);
   canvas.removeEventListener("touchstart", this._evPrevent);
   canvas.removeEventListener("contextmenu", this._evPrevent);
   document.removeEventListener("mouseup", this._evMU); 
   document.removeEventListener("touchend", this._evTC);
   document.removeEventListener("touchcancel", this._evTC);
   document.removeEventListener("mousemove", this._evMM);
   document.removeEventListener("touchmove", this._evTM);

   this._canvas.style.touchAction = this._oldStyle;
   this._canvas = false;
};

CanvasPerformer.prototype.Perform = function(e, cursorData, canvas)
{
   var context = canvas.getContext("2d");
   var clientRect = canvas.getBoundingClientRect();
   var clientStyle = window.getComputedStyle(canvas);
   var scalingX = canvas.clientWidth / canvas.width;
   var scalingY = canvas.clientHeight / canvas.height;

   //Do NOTHING if the canvas is non-existent
   if(scalingX <= 0 || scalingY <= 0) return;

   cursorData = this.GetModifiedCursorData(cursorData, e);
   cursorData.x = (cursorData.x - (clientRect.left + parseFloat(clientStyle.borderLeftWidth))) / scalingX;
   cursorData.y = (cursorData.y - (clientRect.top + parseFloat(clientStyle.borderTopWidth))) / scalingY;

   //console.log(scalingX + ", " + scalingY + ", " + cursorData.x + ", " + cursorData.y);
   cursorData.targetElement = canvas;
   cursorData.onTarget = (e.target === canvas);
   //console.log("onTarget: " + cursorData.onTarget);
   //cursorData.onTarget = (cursorData.x >= 0 && cursorData.y >= 0 &&
   //   cursorData.x < canvas.width && cursorData.y < canvas.height);
   cursorData.time = Date.now();

   if(e && this.ShouldCapture(cursorData)) 
   {
      e.preventDefault();
      //e.preventDefault();
      //e.stopPropagation();
      //console.log("STOP PROP: " + cursorData.Action);
      //canvas.focus();
      //if(cursorData.action & CursorActions.End) 
      //{
      //   document.body.focus();
      //   //canvas.parentNode.focus();
      //   console.log("FUCUSING");
      //}
   }

   if(this.OnAction) this.OnAction(cursorData, context);
};

// --- CanvasZoomer ---
// An extension to CanvasPerformer that tracks zoom. Position is also tracked,
// but panning is not implemented.

function CanvasZoomer()
{
   CanvasPerformer.call(this);

   this.x = 0;          //You SHOULD be able to set these whenever you want.
   this.y = 0;
   this.zoom = 0;       //Zoom works on powers. Negative is zoom out, positive is zoom in
   this.minZoom = -5;   //Lowest value for zoom. You may need to adapt this to your image
   this.maxZoom = 5;    //Highest zoom. Set to 0 for no zoom in ability.

   this.Width = function() { return 1;};      //Inheritors or users will need to set these
   this.Height = function() { return 1;};
}

CanvasZoomer.prototype = Object.create(CanvasPerformer.prototype); 

CanvasZoomer.prototype.Scale = function()
{
   return Math.pow(2, this.zoom);
};

//Get the size of the image for the current zoom.
CanvasZoomer.prototype.ZoomDimensions = function()
{
   return [ this.Width() * this.Scale(), this.Height() * this.Scale() ];
};

//Perform a zoom for the given zoom amount (if possible)
CanvasZoomer.prototype.DoZoom = function(zoomAmount, cx, cy)
{
   var newZoom = this.zoom + zoomAmount;

   if(newZoom >= this.minZoom && newZoom <= this.maxZoom)
   {
      var oldDim = this.ZoomDimensions();
      this.zoom = newZoom;
      var newDim = this.ZoomDimensions();
      this.x = (newDim[0] / oldDim[0]) * (this.x - cx) + cx;
      this.y = (newDim[1] / oldDim[1]) * (this.y - cy) + cy;
   }
};

//Fix cursor data so the X and Y position is relative to the actual thing and
//not the given canvas. The 'actual thing' being the thing at this.x, this.y
CanvasZoomer.prototype.GetFixedCursorData = function(data)
{
   data.x = (data.x - this.x) / this.Scale();
   data.y = (data.y - this.y) / this.Scale();
   data.onImage = data.x >= 0 && data.y >= 0 && data.x < this.Width() && data.y < this.Height();
   return data;
};

// --- CanvasImageViewer ---
// Allows images to be panned/zoomed/etc in a canvas.

function CanvasImageViewer(image)
{
   //CanvasPerformer.call(this);
   CanvasZoomer.call(this);

   this.image = image;  //User may not supply this. That's fine.
   this.vx = 0;         //Velocity of image. Will drift if no mouse input
   this.vy = 0;
   this.vDecay = 1.08;  //This is division of velocity per frame
   this.vStop = 0.15;   //This is the speed at which the sliding will stop.
   this.edgeBumper = 10;//How many pixels to leave on screen when at edge.
   this.forceRefreshNextFrame = false;

   //"Private" variables
   this._oldX = -1;
   this._oldY = -1;
   this._oldZoom = this.zoom;
   this._held = false;
   this._lastFrame = 0;

   //Event handlers (that can be removed, so they are members)
   var viewer = this;
   var actionStarted = false;
   var lastAction;

   this.OnAction = function(data, context)
   {
      if((data.action & CursorActions.Start) && data.onTarget)
         actionStarted = true;

      //Do NOT perform the initial drag action. Both dragging and panning
      //can cause a direct position update.
      viewer._held = actionStarted && !(data.action & (CursorActions.Start | CursorActions.End)) &&   
                     (data.action & (CursorActions.Drag | CursorActions.Pan));

      if(viewer._held)
      {
         viewer.UpdatePosition(1, data.x - lastAction.x, data.y - lastAction.y);
      }

      //Only perform actions if they have started WITHIN the canvas.
      if(actionStarted)
      {
         if(data.action & CursorActions.Zoom)
            viewer.DoZoom(data.zoomDelta, data.x, data.y);
      }

      if(data.action & CursorActions.End)
         actionStarted = false;

      lastAction = data;
   };

   this.ShouldCapture = function(data)
   {
      return data.onTarget && !(data.action & (CursorActions.Start | CursorActions.End));
      //(data.action & (CursorActions.Pan | CursorActions.Move)) &&;//actionStarted;
   };

   this._evResize = function() {viewer.Refresh();};
}

//Inherit from CanvasPerformer
//CanvasImageViewer.prototype = Object.create(CanvasPerformer.prototype); 
CanvasImageViewer.prototype = Object.create(CanvasZoomer.prototype); 

//Refresh ONLY the graphics (not any values)
CanvasImageViewer.prototype.Refresh = function()
{
   var ctx = this._canvas.getContext("2d");
   CanvasUtilities.AutoSize(this._canvas);
   var imageDim = this.ZoomDimensions();
   ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
   ctx.drawImage(this.image, this.x, this.y, imageDim[0], imageDim[1]);
};

//What to do each animation frame. Basically: only refresh the image if
//something changed, otherwise just keep track of changes and do the next frame.
CanvasImageViewer.prototype.DoFrame = function()
{
   if(this._canvas && this.image)
   { 
      var timePass = 60 * (performance.now() - this._lastFrame) / 1000;
      this._lastFrame = performance.now();
      requestAnimationFrame(this.DoFrame.bind(this));

      if(this._held)
      {
         this.vx = this.x - this._oldX;
         this.vy = this.y - this._oldY;
      }
      else
      {
         this.UpdatePosition(timePass);
      }

      if(this._oldX !== this.x || this._oldY !== this.y || this._oldZoom !== this.zoom || 
         this.forceRefreshNextFrame)
      {
         this.Refresh();
      }

      this.forceRefreshNextFrame = false;
      this._oldX = this.x;
      this._oldY = this.y;
      this._oldZoom = this.zoom;
   }
};

//Update the position based on the given passage of time. In our case, this is
//the fraction of frames that have passed.
CanvasImageViewer.prototype.UpdatePosition = function(timePass, vx, vy)
{
   if(vx === undefined) vx = this.vx;
   if(vy === undefined) vy = this.vy;

   this.x += vx * timePass;
   this.y += vy * timePass;

   var dims = this.ZoomDimensions();

   //Choose the other side if moving that way.
   if (this.x > 0) dims[0] = this._canvas.width;
   if (this.y > 0) dims[1] = this._canvas.height;

   dims[0] -= this.edgeBumper; dims[1] -= this.edgeBumper;

   //Edge cutoffs
   if(Math.abs(this.x) > dims[0]) { this.x = dims[0] * Math.sign(this.x); this.vx = 0; }
   if(Math.abs(this.y) > dims[1]) { this.y = dims[1] * Math.sign(this.y); this.vy = 0; }

   var decay = this.vDecay * timePass;

   this.vx = this.vx / decay; 
   this.vy = this.vy / decay;

   //Halt the sliding if we get below the cutoff so we don't slide forever.
   if(Math.sqrt(this.vy * this.vy + this.vx * this.vx) < this.vStop) { this.vy = 0; this.vx = 0; }
};

//Sets up the image viewer in the given canvas and "attaches" all our events
//and whatever to it.
CanvasImageViewer.prototype.Attach = function(canvas, image)
{
   CanvasZoomer.prototype.Attach.apply(this, [canvas]);

   if(image) this.image = image;
   if(!this.image) throw "No image supplied!";
   this.Width = function() {return this.image.width;};
   this.Height = function() {return this.image.height;};

   requestAnimationFrame(this.DoFrame.bind(this));
   window.addEventListener("resize", this._evResize); 
};

CanvasImageViewer.prototype.Detach = function()
{
   CanvasZoomer.prototype.Detach.apply(this, [canvas]);
   window.removeEventListener("resize", this._evResize); 
};

// --- CanvasMultiImageViewer ---
// Allows multiple images to be panned/zoomed/etc in a canvas (each with their
// own opacities). All images are assumed to have the same dimensions as the
// first image supplied!

function CanvasMultiImageViewer(images)
{
   CanvasImageViewer.call(this);
   this.images = images;
   this.blendMode = "source-over";
}

//Inherit from CanvasImageViewer
CanvasMultiImageViewer.prototype = Object.create(CanvasImageViewer.prototype); 

//Our own attach function just applies and checks the "images" array 
//(which is unique to us)
CanvasMultiImageViewer.prototype.Attach = function(canvas, images)
{
   if(this._canvas)
      throw "This CanvasMultiImageViewer is already attached to a canvas!";

   if(images) this.images = images;

   if(!this.images)
      throw "No images supplied! Must be CanvasMultiImage objects";

   CanvasImageViewer.prototype.Attach.apply(this, [canvas, this.images[0].image]);
};

//Refresh ONLY the graphics (not any values)
CanvasMultiImageViewer.prototype.Refresh = function()
{
   var ctx = this._canvas.getContext("2d");
   var imageDim = this.ZoomDimensions();
   CanvasUtilities.AutoSize(this._canvas);
   ctx.globalAlpha = 1.0;
   ctx.globalCompositeOperation = this.blendMode;
   ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
   for(var i = 0; i < this.images.length; i++)
   {
      if(this.images[i].draw)
      {
         ctx.globalAlpha = this.images[i].opacity;
         CanvasUtilities.OptimizedDrawImage(ctx, this.images[i].image, this.x, this.y, imageDim[0], imageDim[1]);
      }
   }
};

//The image objects used in CanvasMultiImageViewer
function CanvasMultiImage(image, opacity)
{
   this.image = image;
   this.opacity = opacity || 1.0;
   this.draw = true;
}

// --- MultiImageBlender ---
// Blends a series of images with a slider to pick which images to blend and
// how much. Useful for progressions (like controllable timelapses)

function MultiImageBlender()
{
   this.blendGranularity = 16;

   this._imageViewer = new CanvasMultiImageViewer();
   this._imageViewer.blendMode = "lighter";

   this._div = false;
   this._canvas = false;
   this._slider = false;

   var blender = this;
   this._evResize = function() {blender.Refresh();};
}

MultiImageBlender.StyleID = HTMLUtilities.GetUniqueID("multiImageBlenderStyle");

MultiImageBlender.prototype.TrySetDefaultStyles = function()
{
   if(document.getElementById(MultiImageBlender.StyleID))
      return;

   console.log("Setting up MultiImageBlender default styles for the first time");
   var mStyle = document.createElement("style");
   mStyle.appendChild(document.createTextNode(""));
   mStyle.id = MultiImageBlender.StyleID;
   document.head.insertBefore(mStyle, document.head.firstChild);
   mStyle.sheet.insertRule(".imageBlenderLoadBar { height: 1.0rem; " +
      "margin: 0; padding: 0; position: absolute; top: 0; left: 0; " +
      "background-color: #4286f4}", 0);
   mStyle.sheet.insertRule(".imageBlenderLoadText { font-size: 0.7rem; " +
      "font-family: sans-serif; color: #CCC; padding: 0.1rem; " +
      "position: absolute; top: 0; left: 0; margin: 0; display: block;}", 1);
   mStyle.sheet.insertRule(".imageBlenderSlider { display: block; " +
      "padding: 0; margin: 0; width: 100%; }", 2);
   mStyle.sheet.insertRule(".imageBlenderCanvas { display: block; " +
      "padding: 0; margin: 0; width: 100%; }", 3);
};

//Changing the size of the div should fix the height of the canvas. The reason
//we do this is to make sure the canvas fills the div the user gave us.
MultiImageBlender.prototype.Refresh = function()
{
   this._canvas.style.height = "calc(" + this._div.clientHeight + "px - 0.0rem - " +
      this._slider.clientHeight + "px)"; 
};

//Attach the MultiImageBlender to the given div and fill it with relevant
//elements. NOTE: the div should have a well defined height! The elements we
//add (such as canvas, etc.) will fill the entire div.
MultiImageBlender.prototype.Attach = function(div)
{
   if(this._canvas)
      throw "This MultiImageBlender is already attached!";

   var blender = this;
   var slider = document.createElement("input");
   slider.setAttribute("type", "range");
   slider.className = "imageBlenderSlider";
   slider.addEventListener("input", function(){blender.UpdateImages();});

   var canvas = document.createElement("canvas");
   canvas.className = "imageBlenderCanvas";

   div.style.position = "relative";
   div.style.overflow = "hidden";
   div.appendChild(canvas);
   div.appendChild(slider);

   this._div = div;
   this._canvas = canvas;
   this._slider = slider;

   this._imageViewer.Attach(this._canvas, [new CanvasMultiImage(new Image())]);
   window.addEventListener("resize", this._evResize); 
   this.Refresh();
};

//Remove the MultiImageBlender from the div it is attached to. This SHOULD
//leave it in the state it was in before attaching, but.... we'll see.
MultiImageBlender.prototype.Detach = function()
{
   if(!this._div)
      throw "This MultiImageBlender is not attached!";

   this._imageViewer.Detach();

   this._div.removeChild(this._canvas);
   this._div.removeChild(this._slider);
   this._div.style = "";

   this._div = false;
   window.removeEventListener("resize", this._evResize); 
};

//Update image data in the ImageViewer based on the slider position.
MultiImageBlender.prototype.UpdateImages = function()
{
   var i = Math.floor(this._slider.value / this.blendGranularity);
   var j = i + 1; 
   var d = this._slider.value - i * this.blendGranularity;

   for(var k = 0; k < this._imageViewer.images.length; k++)
   {
      this._imageViewer.images[k].draw = false;
      if(k == i)
      {
         this._imageViewer.images[k].opacity = 1 - d / this.blendGranularity;
         this._imageViewer.images[k].draw = true;
      }
      if(k == j)
      {
         this._imageViewer.images[k].opacity = d / this.blendGranularity;
         this._imageViewer.images[k].draw = true;
      }
   }

   this._imageViewer.forceRefreshNextFrame = true;
};

//Create/setup the loading bar element and return it. 
MultiImageBlender.prototype.CreateLoadBar = function()
{
   this.TrySetDefaultStyles();
   var progress = document.createElement("span");
   progress.className = "imageBlenderLoadBar";
   return progress;
};

//Create/setup the load text element and return it.
MultiImageBlender.prototype.CreateLoadText = function()
{
   this.TrySetDefaultStyles();
   var loadText = document.createElement("span");
   loadText.className = "imageBlenderLoadText";
   return loadText;
};

//imageList is a list of string sources. This function will load them all, YO
MultiImageBlender.prototype.LoadImages = function(imageList)
{
   this._imageViewer.images = [];
   var i;
   var loaded = 0;
   var blender = this;
   var progress = this.CreateLoadBar();
   var loadText = this.CreateLoadText();
   loadText.innerHTML = "Loading " + imageList.length + " images...";
   this._div.appendChild(progress);
   this._div.appendChild(loadText);

   var imageLoad = function()
   {
      loaded++;
      progress.style.width = (blender._div.clientWidth * loaded / imageList.length) + "px";
      if(loaded === imageList.length)
      {
         blender._div.removeChild(progress);
         blender._div.removeChild(loadText);
         blender._slider.value = 0;
         blender._slider.min = 0;
         blender._slider.max = (imageList.length - 1) * blender.blendGranularity;
         blender._imageViewer.image = blender._imageViewer.images[0].image;
         var dims = blender._imageViewer.ZoomDimensions();
         blender._imageViewer.x = -(dims[0] - blender._canvas.width) / 2;
         blender._imageViewer.y = -(dims[1] - blender._canvas.height) / 2;
         blender.UpdateImages();
      }
   };

   for(i = 0; i < imageList.length; i++)
   {
      var image = new Image();
      image.addEventListener("load", imageLoad);
      image.src = imageList[i];
      this._imageViewer.images.push(new CanvasMultiImage(image));
   }
};

// --- CanvasDrawer ---
// Allows art programs to be created easily from an existing canvas. Full
// functionality is achieved when layers and an overlay are provided.

function CanvasDrawerTool(tool, overlay, cursor)
{
   this.tool = tool;
   this.overlay = overlay;
   this.interrupt = false;
   this.cursor = cursor;
   this.stationaryReportInterval = 0;
   this.frameLock = 0;
   this.updateUndoBuffer = 1;
}

function CanvasDrawerLayer(canvas, id)
{
   this.canvas = canvas;
   this.opacity = 1.0;
   this.id = id || 0;
}

function CanvasDrawer()
{
   CanvasPerformer.call(this);

   this.buffers = [];
   this.frameActions = [];
   this.undoBuffer = false;
   this.tools = 
   {
      "freehand" : new CanvasDrawerTool(CanvasDrawer.FreehandTool),
      "eraser" : new CanvasDrawerTool(CanvasDrawer.EraserTool),
      "slow" : new CanvasDrawerTool(CanvasDrawer.SlowTool),
      "spray" : new CanvasDrawerTool(CanvasDrawer.SprayTool),
      "line" : new CanvasDrawerTool(CanvasDrawer.LineTool, CanvasDrawer.LineOverlay),
      "square" : new CanvasDrawerTool(CanvasDrawer.SquareTool, CanvasDrawer.SquareOverlay),
      "clear" : new CanvasDrawerTool(CanvasDrawer.ClearTool),
      "fill" : new CanvasDrawerTool(CanvasDrawer.FillTool),
      "dropper" : new CanvasDrawerTool(CanvasDrawer.DropperTool),
      "mover" : new CanvasDrawerTool(CanvasDrawer.MoveTool, CanvasDrawer.MoveOverlay)
   };

   this.constants = {
      "endInterrupt" : CursorActions.End | CursorActions.Interrupt
   };

   this.tools.slow.stationaryReportInterval = 1;
   this.tools.spray.stationaryReportInterval = 1;
   this.tools.slow.frameLock = 1;
   this.tools.spray.frameLock = 1;
   this.tools.dropper.updateUndoBuffer = 0;
   this.tools.mover.interrupt = CanvasDrawer.MoveInterrupt;

   this.overlay = false; //overlay is set with Attach. This false means nothing.
   this.onlyInnerStrokes = true;
   this.defaultCursor = "crosshair";
   this.currentLayer = 0;
   this.currentTool = "freehand";
   this.color = "rgb(0,0,0)";
   this.opacity = 1;
   this.lineWidth = 2;
   //this.cursorColor = "rgb(128,128,128)";
   this.lineShape = "hardcircle";

   this.lastAction = false;
   this.ignoreCurrentStroke = false;

   //All private stuff that's only used for our internal functions.
   var me = this;
   var strokeCount = 0;
   var frameCount = 0;

   this.StrokeCount = function() { return strokeCount; };
   this.FrameCount = function() { return frameCount; };

   this.OnUndoStateChange = false;
   this.OnLayerChange = false;
   this.OnColorChange = false;
   this.OnAction = function(data, context)
   {
      if(me.CheckToolValidity("tool") && (data.action & CursorActions.Drag))
      {
         data.color = me.color;
         data.lineWidth = me.lineWidth;
         data.lineShape = me.lineShape;
         data.opacity = me.opacity;

         if(me.lineShape === "hardcircle")
            data.lineFunction = CanvasUtilities.DrawSolidRoundLine;
         else if(me.lineShape === "hardsquare")
            data.lineFunction = CanvasUtilities.DrawSolidSquareLine;
         else if(me.lineShape === "normalsquare")
            data.lineFunction = CanvasUtilities.DrawNormalSquareLine;
         else
            data.lineFunction = CanvasUtilities.DrawNormalRoundLine; 

         //Replace this with some generic cursor drawing thing that takes both
         //strings AND functions to draw the cursor.
         if(!me.CheckToolValidity("cursor") && (data.action & CursorActions.Start)) 
            me._canvas.style.cursor = me.defaultCursor;

         if(data.action & CursorActions.Start) 
         {
            data.oldX = data.x; 
            data.oldY = data.y; 
            data.startX = data.x;
            data.startY = data.y;
            strokeCount++;
         }
         else
         {
            data.oldX = me.lastAction.x;
            data.oldY = me.lastAction.y;
            data.startX = me.lastAction.startX;
            data.startY = me.lastAction.startY;
         }

         if(me.CheckToolValidity("frameLock"))
            me.frameActions.push({"data" : data, "context": context});
         else
            me.PerformDrawAction(data, context);
      }
   };
   this._doFrame = function()
   {
      frameCount++;

      //Oh look, we were detached. How nice.
      if(!me._canvas) return;

      //I don't care what the tool wants or what the settings are, all I care
      //about is whether or not there are actions for me to perform. Maybe some
      //other thing added actions; I shouldn't ignore those.
      if(me.frameActions.length)
      {
         for(var i = 0; i < me.frameActions.length; i++)
         {
            if(me.frameActions[i].data.action & (CursorActions.Start |
               CursorActions.End) || i === me.frameActions.length - 1)
            {
               me.PerformDrawAction(me.frameActions[i].data,
                  me.frameActions[i].context);
            }
         }

         me.frameActions = [];
      }
      //Only reperform the last action if there was no action this frame, both
      //the tool and the reportInterval are valid, there even WAS a lastAction
      //which had Drag but not Start/End, and it's far enough away from the
      //last stationary report.
      else if (me.CheckToolValidity("stationaryReportInterval") && me.CheckToolValidity("tool") && 
         me.lastAction && (me.lastAction.action & CursorActions.Drag) && 
         !(me.lastAction.action & (CursorActions.End)) && 
         (frameCount % me.tools[me.currentTool].stationaryReportInterval) === 0)
      {
         me.PerformDrawAction(me.lastAction, me.GetCurrentCanvas().getContext("2d"));
      }

      requestAnimationFrame(me._doFrame);
   };
}

//Inherit from CanvasPerformer
CanvasDrawer.prototype = Object.create(CanvasPerformer.prototype); 

CanvasDrawer.prototype.Buffered = function()
{ return this.buffers.length > 0; };

//Convert layer ID (which can be anything) to actual index into layer buffer.
//Only works if there is actually a buffer.
CanvasDrawer.prototype.LayerIDToBufferIndex = function(id)
{
   for(var i = 0; i < this.buffers.length; i++)
      if(this.buffers[i].id === id)
         return i;

   return -1;
};

CanvasDrawer.prototype.CurrentLayerIndex = function()
{ return this.LayerIDToBufferIndex(this.currentLayer); };

CanvasDrawer.prototype.GetLayerByID = function(id)
{ return this.buffers[this.LayerIDToBufferIndex(id)]; };

//Only works if it's buffered. Otherwise, you'll actually get an error.
CanvasDrawer.prototype.GetCurrentLayer= function()
{ return this.GetLayerByID(this.currentLayer); };

//Get the canvas that the user should currently be drawing on. 
CanvasDrawer.prototype.GetCurrentCanvas = function()
{
   if(this.Buffered())
      return this.GetCurrentLayer().canvas;
   else
      return this._canvas;
};

CanvasDrawer.prototype.ClearLayer = function(layer)
{
   this.UpdateUndoBuffer();
   if(layer !== undefined && this.Buffered())
      CanvasUtilities.Clear(this.GetLayerByID(layer).canvas, false); 
   else
      CanvasUtilities.Clear(this.GetCurrentCanvas(), false); 
   this.Redraw();
};

CanvasDrawer.prototype.CheckToolValidity = function(field)
{ 
   return this.tools && this.tools[this.currentTool] && 
      (!field || this.tools[this.currentTool][field]);
};

CanvasDrawer.prototype.SupportsUndo = function()
{ return (this.undoBuffer ? true : false); };

CanvasDrawer.prototype.CanUndo = function()
{ return this.SupportsUndo() && this.undoBuffer.UndoCount() > 0; };

CanvasDrawer.prototype.CanRedo = function()
{ return this.SupportsUndo() && this.undoBuffer.RedoCount() > 0; };

CanvasDrawer.prototype.DoUndoStateChange = function()
{ if(this.OnUndoStateChange) this.OnUndoStateChange(); };

CanvasDrawer.prototype.DoLayerChange = function()
{ if(this.OnLayerChange) this.OnLayerChange(this.currentLayer); };

CanvasDrawer.prototype.DoColorChange = function()
{ if(this.OnColorChange) this.OnColorChange(this.color); };

CanvasDrawer.prototype.SetLayer = function(layer)
{ this.currentLayer = layer; this.DoLayerChange(); };

CanvasDrawer.prototype.SetColor = function(color)
{ this.color= color; this.DoColorChange(); };

//This is for both undos and redos
CanvasDrawer.prototype._PerformUndoRedoSwap = function(swapFunction)
{
   //Figure out which static canvas we're going to use to store our current state.
   var currentState = this.undoBuffer.staticBuffer[this.undoBuffer.virtualIndex];
   //Perform the actual action with a non-filled current state (just to get it in there)
   var nextState = swapFunction(currentState);
   //The reason we don't fill in currentState until now is because we need the nextState data
   currentState.id = nextState.id;
   this.currentLayer = nextState.id;
   //Now we simply put our current drawing into the buffer and apply the bufferr's state
   CanvasUtilities.CopyInto(currentState.canvas.getContext("2d"), this.GetCurrentCanvas());
   CanvasUtilities.CopyInto(this.GetCurrentCanvas().getContext("2d"), nextState.canvas);
   this.Redraw();
   this.DoLayerChange();
   this.DoUndoStateChange();
};

CanvasDrawer.prototype.Undo = function()
{
   if(!this.CanUndo()) return;
   this._PerformUndoRedoSwap(this.undoBuffer.Undo.bind(this.undoBuffer));
};

CanvasDrawer.prototype.Redo = function()
{
   if(!this.CanRedo()) return;
   this._PerformUndoRedoSwap(this.undoBuffer.Redo.bind(this.undoBuffer));
};

CanvasDrawer.prototype.ClearUndoBuffer = function()
{
   this.undoBuffer.Clear();
   this.DoUndoStateChange();
};

CanvasDrawer.prototype.UpdateUndoBuffer = function()
{
   if(!this.SupportsUndo()) return;
   console.trace("Updating undo buffer");
   var currentState = this.undoBuffer.staticBuffer[this.undoBuffer.virtualIndex];
   currentState.id = this.currentLayer;
   CanvasUtilities.CopyInto(currentState.canvas.getContext("2d"), this.GetCurrentCanvas());
   this.undoBuffer.Add(currentState);
   this.DoUndoStateChange();
};

//Draw all layers and whatever into the given canvas. Note that this function
//simply doesn't work if the drawer doesn't support layers.
CanvasDrawer.prototype.DrawIntoCanvas = function(bounding, canvas)
{
   //We can't DO anything if there are no buffers; redrawing the overlay would
   //make us lose the drawing itself!
   if(!this.Buffered() || bounding === false) return;

   var context = canvas.getContext("2d");
   var oldComposition = context.globalCompositeOperation;
   var oldAlpha = context.globalAlpha;
   context.globalCompositeOperation = "source-over";
   if(!bounding) bounding = [0,0,canvas.width,canvas.height];
   bounding[0] = MathUtilities.MinMax(Math.floor(bounding[0]), 0, canvas.width - 1);
   bounding[1] = MathUtilities.MinMax(Math.floor(bounding[1]), 0, canvas.height - 1);
   //bounding[2] = MathUtilities.MinMax(Math.ceil(bounding[2]), 0, canvas.width - 1);
   //bounding[3] = MathUtilities.MinMax(Math.ceil(bounding[3]), 0, canvas.height - 1);
   bounding[2] = Math.ceil(bounding[2]);
   bounding[3] = Math.ceil(bounding[3]);
   if(bounding[0] + bounding[2] > canvas.width)
      bounding[2] = canvas.width - bounding[0];
   if(bounding[1] + bounding[3] > canvas.height)
      bounding[3] = canvas.height - bounding[1];
      //alert("new version");
   //alert("new version");
   //console.debug(bounding);
   //This stuff may be unnecessary, but apparently some canvases don't like
   //weird or undoable crops
   /*if(bounding[0] < 0)
   {
      bounding[2] += bounding[0];
      bounding[0] = 0;
   }
   if(bounding[0] + bounding[2] >= this._canvas.width) 
      bounding[2] = */
   //context.clearRect(bounding[0] + offsetX, bounding[1] + offsetY, bounding[2] * zoom, bounding[3] * zoom);
   context.clearRect(bounding[0], bounding[1], bounding[2], bounding[3]);
   if(this.overlay.active) this.buffers.splice(this.CurrentLayerIndex() + 1, 0, this.overlay);
   for(var i = 0; i < this.buffers.length; i++)
   {
      context.globalAlpha = this.buffers[i].opacity;
      //context.drawImage(this.buffers[i].canvas, 
      //   bounding[0], bounding[1], bounding[2], bounding[3],
      //   bounding[0] + offsetX, bounding[1] + offsetY, bounding[2] * zoom, bounding[3] * zoom);
      //CanvasUtilities.OptimizedDrawImage(context, this.buffers[i].canvas, bounding[0], bounding[1]);
      //This is... optimized??? IDK
      context.drawImage(this.buffers[i].canvas, 
         bounding[0], bounding[1], bounding[2], bounding[3],
         bounding[0], bounding[1], bounding[2], bounding[3]);
   }
   if(this.overlay.active) this.buffers.splice(this.CurrentLayerIndex() + 1, 1);
   context.globalAlpha = oldAlpha;
   context.globalCompositeOperation = oldComposition;
};

CanvasDrawer.prototype.Redraw = function(bounding)
{
   this.DrawIntoCanvas(bounding, this._canvas);
};

CanvasDrawer.prototype.PerformDrawAction = function(data, context)
{
   //Ensure the drawing canvases are properly set up before we hand the data
   //off to a tool action thingy.
   var bcontext = this.GetCurrentCanvas().getContext("2d");
   context.fillStyle = this.color;
   bcontext.fillStyle = this.color;
   context.globalAlpha = 1.0; //this.opacity;
   bcontext.globalAlpha = this.opacity;

   if((data.action & CursorActions.Interrupt))
   {
      //Interrupted? Clear the overlay... don't know what we were doing
      //but whatever, man. Oh and call the tool's interrupt function...
      this.overlay.active = false;
      var interruptHandler = this.CheckToolValidity("interrupt");
      if(interruptHandler) interruptHandler(data, bcontext, this);
      //CanvasUtilities.Clear(this.overlay.canvas);
      //UXUtilities.Toast("Disabling overlay");
      //console.log("Clearing overlay");
   }

   if(data.action & CursorActions.Start)
   {
      if((data.action & CursorActions.Interrupt) || (this.onlyInnerStrokes && !data.onTarget))
      {
         this.ignoreCurrentStroke = true;
         console.debug("ignoring stroke. Interrupt: " + ((data.action & CursorActions.Interrupt) > 0));
      }
      else
      {
         if(this.CheckToolValidity("updateUndoBuffer"))
            this.UpdateUndoBuffer();
      }
   }

   //A special case: The last stroke that was valid was interrupted, so we need
   //to undo the stroke (only if the stroke wasn't ignored in the first place)
   if(!this.ignoreCurrentStroke && (data.action & this.constants.endInterrupt) ===
      this.constants.endInterrupt && this.CheckToolValidity("updateUndoBuffer"))
   {
      this.ignoreCurrentStroke = true;
      this.Undo();
      this.undoBuffer.ClearRedos();
      this.DoUndoStateChange();
   }

   //Now actually perform the action.
   if(!this.ignoreCurrentStroke)
   {
      var bounding = this.tools[this.currentTool].tool(data, bcontext, this);
      var overlay = this.CheckToolValidity("overlay");

      if(overlay && this.overlay.canvas)
      {
         var overlayContext = this.overlay.canvas.getContext("2d");
         overlayContext.fillStyle = this.color;
         overlayContext.globalAlpha = this.opacity;
         overlayContext.clearRect(0, 0, this.overlay.canvas.width, this.overlay.canvas.height);
         this.overlay.active = (overlay(data, overlayContext, this) !== false);
      }

      if(this.overlay.active)
         this.Redraw();
      else
         this.Redraw(bounding);
   }

   if(data.action & CursorActions.End)
   {
      if(this.ignoreCurrentStroke)
         console.debug("No longer ignoring stroke");
      this.ignoreCurrentStroke = false;
   }

   this.lastAction = data; 
};

CanvasDrawer.prototype.ResetUndoBuffer = function(size, canvasBlueprint)
{
   canvasBlueprint = canvasBlueprint || this._canvas;
   size = size || (this.undoBuffer.staticBuffer.length - 1);
   this.undoBuffer = new UndoBuffer(size, size + 1);
   this.undoBuffer.staticBuffer = [];
   for(i = 0; i < size + 1; i++)
   {
      var layer = new CanvasDrawerLayer(CanvasUtilities.CreateCopy(canvasBlueprint), -1);
      this.undoBuffer.staticBuffer.push(layer);
   }
};

//Assumes mainCanvas is the same size as all the layers. All undo buffers and
//overlays will be the same size as mainCanvas.
CanvasDrawer.prototype.Attach = function(mainCanvas, layers, undoCount, useToolOverlay)
{
   var i;

   if(undoCount === undefined)
      undoCount = 5;
   if(useToolOverlay === undefined)
      useToolOverlay = true;

   if(useToolOverlay)
      this.overlay = new CanvasDrawerLayer(CanvasUtilities.CreateCopy(mainCanvas), -1);
   else
      this.overlay = new CanvasDrawerLayer(false, -1);

   this.buffers = [];

   for(i = 0; i < layers.length; i++)
      this.buffers.push(new CanvasDrawerLayer(layers[i], i));

   if(undoCount)
      this.ResetUndoBuffer(undoCount, mainCanvas);
   else
      this.undoBuffer = false;

   //mainCanvas.setAttribute("tabindex", "-1");
   CanvasPerformer.prototype.Attach.apply(this, [mainCanvas]);
   this._canvas.style.cursor = this.defaultCursor; //Assume the default cursor will do. Fix later!
   this._doFrame();
};

CanvasDrawer.prototype.Detach= function()
{
   this.undoBuffer = false;
   this.buffers = false;
   this.overlay = false;
   CanvasPerformer.prototype.Detach.apply(this, []);
};

CanvasDrawer.prototype.ToString = function()
{
   //Version 1-2 assumes the width and height of all layers are the same.
   var object = {version:2, width: this._canvas.width, height: this._canvas.height};
   var layers = [];

   var layerToObject = function(layer)
   {
      return {
         canvas:CanvasUtilities.ToString(layer.canvas),
         opacity:layer.opacity
      };
   };

   if(this.Buffered())
   {
      object.buffered = true;
      for(var i = 0; i < this.buffers.length; i++)
      {
         layers.push(layerToObject(this.buffers[i]));
      }
   }
   else
   {
      object.buffered = false;
      layers.push({
         canvas:CanvasUtilities.ToString(this._canvas),
         opacity:1.0
      });
   }

   object.layers = layers;

   return JSON.stringify(object);
};

CanvasDrawer.prototype.FromString = function(string, callback)
{
   var object = JSON.parse(string);
   var me = this;

   //Version 1 stuff. May be used in other versions as well.
   var version1LoadComplete = function()
   {
      me.ResetUndoBuffer();
      me.Redraw();     
      if(callback) callback(this, object);
   };
   var version1LayerLoad = function(layer, buffer, redrawCheck)
   {
      CanvasUtilities.DrawDataURL(layer, buffer.canvas, 0, 0, redrawCheck);
   };
   var version1BufferLoad = function(layerLoadFunction)
   {
      var loadedBuffers = 0;
      var redrawCheck = function()
      {
         loadedBuffers++;
         if(loadedBuffers >= object.layers.length) version1LoadComplete();
      };
      for(var i = 0; i < object.layers.length; i++)
      {
         me.buffers[i].canvas.width = object.width;
         me.buffers[i].canvas.height = object.height;
         layerLoadFunction(object.layers[i], me.buffers[i], redrawCheck);
      }
   };
   
   var version2LayerLoad = function(layer, buffer, redrawCheck)
   {
      buffer.opacity = layer.opacity;
      CanvasUtilities.DrawDataURL(layer.canvas, buffer.canvas, 0, 0, redrawCheck);
   };

   //Version 1 assumes you will already have set up your canvasdrawer in a way
   //that you like, so the buffers and overlay canvas better be the same as
   //what the stored object was.
   if(object.version === 1 || object.version == 2)
   {
      this._canvas.width = object.width;
      this._canvas.height = object.height;

      var loadLayerFunction = version1LayerLoad;
      if(object.version === 2) loadLayerFunction = version2LayerLoad;

      if(object.buffered)
      {
         version1BufferLoad(loadLayerFunction);
      }
      else
      {
         loadLayerFunction(object.layers[0], {canvas:this._canvas}, version1LoadComplete);
      }
   }
   else
   {
      throw "Unknown CanvasDrawer version: " + object.version;
   }
};

// --- CanvasDrawer Tools ---
// A bunch of predefined tools for your drawing pleasure

//The most basic of tools: freehand (just like mspaint)
CanvasDrawer.FreehandTool = function(data, context)
{
   return data.lineFunction(context, data.oldX, data.oldY, data.x, data.y, data.lineWidth);
};

CanvasDrawer.EraserTool = function(data, context)
{
   return data.lineFunction(context, data.oldX, data.oldY, data.x, data.y, data.lineWidth, true);
};

//Line tool (uses overlay)
CanvasDrawer.LineTool = function(data, context)
{
   if(data.action & CursorActions.End)
      return data.lineFunction(context, data.startX, data.startY, data.x, data.y, data.lineWidth);
};

CanvasDrawer.LineOverlay = function(data, context)
{
   if((data.action & CursorActions.End) === 0)
      return data.lineFunction(context, data.startX, data.startY, data.x, data.y, data.lineWidth);
   else
      return false;
};

//Square tool (uses overlay)
CanvasDrawer.SquareTool = function(data, context)
{
   if(data.action & CursorActions.End)
   {
      return CanvasUtilities.DrawHollowRectangle(context, 
         data.startX, data.startY, data.x, data.y, data.lineWidth);
   }
};

CanvasDrawer.SquareOverlay = function(data, context)
{
   if((data.action & CursorActions.End) === 0)
   {
      return CanvasUtilities.DrawHollowRectangle(context, 
         data.startX, data.startY, data.x, data.y, data.lineWidth);
   }
   else
   {
      return false;
   }
};

//Clear tool (just completely fills the current layer with color)
CanvasDrawer.ClearTool = function(data, context)
{
   if(data.action & CursorActions.End && data.onTarget)
   {
      CanvasUtilities.Clear(context.canvas, data.color);
   }
};

CanvasDrawer.MoveTool = function(data, context, drawer)
{
   if(data.action & CursorActions.Start)
   {
      drawer.moveToolLayer = CanvasUtilities.CreateCopy(context.canvas, true);
      drawer.moveToolOffset = [0,0];
      CanvasUtilities.Clear(context.canvas, drawer.moveToolClearColor);
      return true; //just redraw everything. No point optimizing
   }
   else if(data.action & CursorActions.End)
   {
      CanvasUtilities.OptimizedDrawImage(context, drawer.moveToolLayer, 
         drawer.moveToolOffset[0], drawer.moveToolOffset[1]);
      drawer.moveToolLayer = false;
      return true; //just redraw everything. No point optimizing.
   }
   else
   {
      drawer.moveToolOffset[0] += (data.x - data.oldX);
      drawer.moveToolOffset[1] += (data.y - data.oldY);
      return false;
   }
};

CanvasDrawer.MoveOverlay = function(data, context, drawer)
{
   if((data.action & CursorActions.End) === 0)
   {
      CanvasUtilities.OptimizedDrawImage(context, drawer.moveToolLayer, 
         drawer.moveToolOffset[0], drawer.moveToolOffset[1]);
      return true;
   }
   else
   {
      return false;
   }
};

CanvasDrawer.MoveInterrupt = function(data, context, drawer)
{
   //UXUtilities.Toast("Fixing move for interrupt");
   //Just put the layer back.
   CanvasUtilities.OptimizedDrawImage(context, drawer.moveToolLayer);
   return true;
};

//CanvasDrawer.MoveTool = function(data, context, drawer)
//{
//   if(!drawer.moveToolStage) drawer.moveToolStage = 0;
//   if(!drawer.moveToolLocation) drawer.moveToolLocation = [0, 0];
//
//   switch(drawer.moveToolStage)
//   {
//      case 0: //Selecting
//         if(data.action & CursorActions.End && data.onTarget) 
//         {
//            var s = MathUtilities.GetSquare(data.startX, data.startY, data.x, data.y);
//            drawer.moveToolSelectData = CanvasUtilities.CreateCopy(context.canvas, true,
//               s[0], s[1], s[2], s[3]); 
//            drawer.moveToolLocation = [s[0], s[1]];
//            context.clearRect(s[0], s[1], s[2], s[3]);
//            drawer.moveToolStage = 1;
//            drawer.moveToolIsSelected = 0;
//            console.debug("Moving to stage 1 of MoveTool. Selected area: " + s.join(","));
//         }
//         break;
//      case 1: //Moving
//         if(drawer.moveToolIsSelected && (data.action & CursorActions.Start) === 0)
//         {
//            //Only actually move if this isn't the first data and the area is
//            //actually selected.
//            drawer.moveToolLocation[0] += (data.x - data.oldX);
//            drawer.moveToolLocation[1] += (data.y - data.oldY);
//         }
//         else if(!drawer.moveToolIsSelected && (data.action & CursorActions.End))
//         {
//            drawer.moveToolStage = 0;
//            console.debug("Returning to stage 0 of MoveTool.");
//            return CanvasUtilities.OptimizedDrawImage(context, 
//               drawer.moveToolSelectData, drawer.moveToolLocation[0], 
//            drawer.moveToolLocation[1]);
//         }
//         if(data.action & CursorActions.Start) 
//         {
//            var point = [data.x, data.y];
//            var square = [drawer.moveToolLocation[0], drawer.moveToolLocation[1], 
//               drawer.moveToolSelectData.width, drawer.moveToolSelectData.height];
//            if(!MathUtilities.IsPointInSquare(point, square)) drawer.moveToolIsSelected = 1;
//         }
//         break;
//   }
//};
//
//CanvasDrawer.MoveOverlay = function(data, context, drawer)
//{
//   switch(drawer.moveToolStage)
//   {
//      case 0:
//         return CanvasUtilities.DrawHollowRectangle(context, 
//            data.startX, data.startY, data.x, data.y, 1);
//      case 1:
//         return CanvasUtilities.OptimizedDrawImage(context, 
//            drawer.moveToolSelectData, drawer.moveToolLocation[0], 
//            drawer.moveToolLocation[1]);
//   }
//};

//Slow tool (courtesy of 12me21)
CanvasDrawer.SlowTool = function(data,context,drawer)
{
   if(drawer.slowAlpha === undefined) drawer.slowAlpha = 0.15;

   if(data.action & CursorActions.Start)
   {
      drawer.avgX=data.x;
      drawer.avgY=data.y;
   }
   drawer.oldX=drawer.avgX;
   drawer.oldY=drawer.avgY;
   if(data.action & CursorActions.Drag && !(data.action & CursorActions.End))
   {
      //var alpha=0.1;
      drawer.avgX=drawer.avgX*(1-drawer.slowAlpha)+data.x*drawer.slowAlpha;
      drawer.avgY=drawer.avgY*(1-drawer.slowAlpha)+data.y*drawer.slowAlpha;
   }
   if(data.action & CursorActions.End)
   {
      drawer.oldX=data.x;
      drawer.oldY=data.y;
   }
   if(data.action & (CursorActions.Drag | CursorActions.End))
   {
      return data.lineFunction(context, drawer.oldX, drawer.oldY, drawer.avgX, drawer.avgY, data.lineWidth);
   }
};

//Spray tool (like mspaint)
CanvasDrawer.SprayTool = function(data,context,drawer)
{
   if(drawer.spraySpread === undefined) drawer.spraySpread = 2;
   if(drawer.sprayRate === undefined) drawer.sprayRate = 1 / 1.5;

   if(data.action & CursorActions.Drag)
   {
      var x,y,radius=data.lineWidth*drawer.spraySpread;
      var count = data.lineWidth * drawer.sprayRate;
      //Math.max(MathUtilities.Distance(data.x,data.y,data.oldX,data.oldY), 1) * 
         //data.lineWidth * drawer.sprayRate;
      for(var i=0;i<count;i+=0.1)
      {
         if(MathUtilities.IntRandom(10)) continue;
         do 
         {
            x=(Math.random()*2-1)*radius;
            y=(Math.random()*2-1)*radius;
         } while (x*x+y*y>radius*radius);
         CanvasUtilities.DrawSolidCenteredRectangle(context, data.x+x, data.y+y, 1, 1);
      }
   }
};

CanvasDrawer.FillTool = function(data, context, drawer) 
{
   if(data.action & CursorActions.End)
   {
      if(drawer.floodThreshold === undefined) drawer.floodThreshold = 0;

      var sx = Math.floor(data.x); 
      var sy = Math.floor(data.y);
      console.debug("Flood filling starting from " + sx + ", " + sy);

      //We create a COPY so that it takes the colors from ALL layers into
      //account (not just the current one). This unfortunately means that
      //layers that are completely occluded will be filled based on the upper
      //layer's colors and shapes, not the current layer. If this is not
      //desireable, replace this fill function with the generic one from
      //CanvasUtilities.
      var canvasCopy = CanvasUtilities.CreateCopy(drawer._canvas);
      drawer.DrawIntoCanvas(undefined, canvasCopy, 1, 0, 0);
      var copyContext = canvasCopy.getContext("2d");
      var copyData = copyContext.getImageData(0,0,canvasCopy.width,canvasCopy.height).data;

      var originalColor = CanvasUtilities.GetColor(copyContext, sx, sy);
      var color = StyleUtilities.GetColor(data.color);
      var ocolorArray = originalColor.ToArray(true);
      var colorArray = color.ToArray(true);
      if(color.MaxDifference(originalColor) <= drawer.floodThreshold) return; 

      CanvasUtilities.GenericFlood(context, sx, sy, function(c, x, y, d)
      {
         var i = CanvasUtilities.ImageDataCoordinate(c, x, y);
         var currentColor = new Color(copyData[i], copyData[i+1], copyData[i+2], copyData[i+3]/255);
         if(originalColor.MaxDifference(currentColor) <= drawer.floodThreshold)
         {
            for(var j = 0; j < 4; j++)
            {
               d[i + j] = colorArray[j];
               copyData[i + j] = colorArray[j];
            }
            return true;
         }
         else
         {
            return false;
         }
      });
   }
};

CanvasDrawer.DropperTool = function(data, context, drawer)
{
   if(data.action & CursorActions.End)
   {
      var sx = Math.floor(data.x); 
      var sy = Math.floor(data.y);
      var canvasCopy = CanvasUtilities.CreateCopy(drawer._canvas);
      drawer.DrawIntoCanvas(undefined, canvasCopy, 1, 0, 0);
      var copyContext = canvasCopy.getContext("2d");
      var pickupColor = CanvasUtilities.GetColor(copyContext, sx, sy);
      drawer.SetColor(pickupColor.ToRGBString());
   }
};


// ------------------------------------------------
// ------------- EXTRAS.JS ------------------------
// ------------------------------------------------


//Carlos Sanchez - 2015
//randomouscrap98@aol.com
//*Extra functions that can help any page.

var quietExtras = !getOrDefault(getQueryVariable("debug"), false);

function now()
{
   if(window.performance)
      return window.performance.now();

   return new Date().getTime();
}

function quietlog(message)
{
   if(!quietExtras)
      console.log(message);
}

function normalize(min, max, mu)
{
   return (mu - min) / (max - min); 
}

function cosineInterpolate(y1, y2, mu)
{
   var mu2 = (1 - Math.cos(mu * Math.PI)) / 2;
   return (y1* (1 - mu2) + y2 * mu2);
}

function swap(i1, i2, list)
{
   if(!list.hasOwnProperty(i1) || !list.hasOwnProperty(i2))
      return false;

   var temp = list[i1];
   list[i1] = list[i2];
   list[i2] = temp;

   return true;
}

function hasSpecial(specialField)
{
   //Assume the FIRST data-special in the document is the one we want.
   var specialElement = document.querySelector("[data-special]");

   if(specialElement && specialElement.dataset.special)
      return specialElement.dataset.special.split(/[\s,]+/).indexOf(specialField) >= 0;
   else
      return false;
}

function intRandom(max, min)
{
   min = getOrDefault(min, 0);

   if(min > max)
   {
      var temp = min;
      min = max;
      max = temp;
   }

   return Math.floor((Math.random() * (max - min)) + min);
}

function reanchor()
{
   var old = window.location;

   if(window.location.hash)
   {
      window.location.hash = window.location.hash;
      history.replaceState(null,null,old);
   }
   //window.location = (""+window.location).replace(/#[A-Za-z0-9_]*$/,'')+"#myAnchor";
   //window.location = window.location;
}

function replaceNode(original, newNode)
{
   insertAfter(original.parentNode, newNode, original);
   original.parentNode.removeChild(original);
}

function isSupportedBrowser()
{
   return typeof InstallTrigger !== 'undefined' || (!!window.chrome && !!window.chrome.webstore);
   //return /Edge\/\d./i.test(navigator.userAgent);
}

function isPropertySupported(property)
{
   return property in document.documentElement.style;
}

function getQueryString(url)
{
   var queryPart = url.match(/(\?[^#]*)/);
   
   if(!queryPart)
      return "";

   return queryPart[1];
}

//Taken from Tarik on StackOverflow:
//http://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
function getQueryVariable(variable, url) 
{
   var query = window.location.search;

   if(getOrDefault(url, false) !== false)
      query = getQueryString(url);

   var vars = query.substring(1).split('&');

   for (var i = 0; i < vars.length; i++) 
   {
      var pair = vars[i].split('=');

      if (decodeURIComponent(pair[0]) == variable) 
         return decodeURIComponent(pair[1]);
   }

   quietlog('Query variable ' + variable + ' not found');
}

function b64EncodeUnicode(str) 
{
   return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function(match, p1) {
         return String.fromCharCode('0x' + p1);
      }));
}

//Returns a function that calls the associated function with any extra
//given arguments. It fixes loop closure issues. Altered from 
//www.cosmocode.de/en/blog/gohr/2009-10/15-javascript-fixing-the-closure-scope-in-loops
//Example: You want x.addEventListener("click", myfunc(i)) in a loop.
//Do this: x.addEventListener("click", myfunc.callBind(i))
Function.prototype.callBind = function()
{
   var fnc = this;
   var args = arguments;
   return function() 
   {
      return fnc.apply(this, args);
   };
};

//get the index of a regex.
String.prototype.regexIndexOf = function(regex, startpos) 
{
   var indexOf = this.substring(startpos || 0).search(regex);
   return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
};

//Adapted from:
//http://osric.com/chris/accidental-developer/2009/08/javascript-insertafter/
/*Object.prototype.insertAfter = function (newNode, afterElement) 
{
   if(this.lastChild === afterElement)
      this.appendChild(newNode);
   else
      this.insertBefore(newNode, afterElement.nextSibling);
}; */
insertAfter = function (parentNode, newNode, afterElement) 
{
   if(parentNode.lastChild === afterElement)
      parentNode.appendChild(newNode);
   else
      parentNode.insertBefore(newNode, afterElement.nextSibling);
}; 

//Taken from
//http://stackoverflow.com/questions/4770457/insert-text-before-and-after-the-selected-text-in-javascript
//Fiddle: http://jsfiddle.net/timdown/UWExN/64/
/*function insertHtmlAtSelectionEnd(html, isBefore) 
{
   quietlog("Trying to insert into selected text: " + html);

   var sel, range, node, lastNode;
   if (window.getSelection) 
   {
      sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) 
      {
         range = window.getSelection().getRangeAt(0);
         range.collapse(isBefore);

         var el = document.createElement("div");
         el.innerHTML = html;
         var frag = document.createDocumentFragment();

         while ((node = el.firstChild))
            lastNode = frag.appendChild(node);

         range.insertNode(frag);
         quietlog("Did insert text");
      }
   }
   else if (document.selection && document.selection.createRange)
   {
      range = document.selection.createRange();
      range.collapse(isBefore);
      range.pasteHTML(html);
   }
}*/

//This ONLY works for an array of numerical values!
function countValues(values)
{
   var i;
   var counts = [];

   for(i = 0; i < values.length; i++)
   {
      if(typeof counts[values[i]] === 'undefined')
         counts[values[i]] = 1;
      else
         counts[values[i]]++;
   }

   return counts;
}

function launchIntoFullscreen(element) 
{
   if(element.requestFullscreen)
      element.requestFullscreen();
   else if(element.mozRequestFullScreen)
      element.mozRequestFullScreen();
   else if(element.webkitRequestFullscreen)
      element.webkitRequestFullscreen();
   else if(element.msRequestFullscreen)
      element.msRequestFullscreen();
}

function exitFullscreen() 
{
   if(document.exitFullscreen)
      document.exitFullscreen();
   else if(document.mozCancelFullScreen)
      document.mozCancelFullScreen();
   else if(document.webkitExitFullscreen)
      document.webkitExitFullscreen();
}

function isFullscreen()
{
   if(document.fullscreenElement || document.mozFullScreenElement ||
      document.webkitFullscreenElement)
      return true;

   return false;
   /*return document.fullscreenEnabled || 
      document.mozFullScreenEnabled || document.webkitFullscreenEnabled;*/
}

function appendSiteStatus(newStatus)
{
   var siteStatus = document.getElementsByTagName("site-status")[0];

   if(!siteStatus)
   {
      siteStatus = document.createElement("site-status");
      var main = document.getElementsByTagName("main")[0];

      if(main.firstChild)
         main.insertBefore(siteStatus, main.firstChild);
      else
         main.appendChild(siteStatus);
   }

   if(siteStatus.innerHTML)
      siteStatus.innerHTML += "<br>" + newStatus;
   else
      siteStatus.innerHTML = newStatus;
}

function escapeRegExp(string)
{
   return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

//Uhhhhh idk
function isNullOrWhitespace(string)
{
   return string === null || string.match(/^\s*$/) !== null;
}

//Clear out the given stylesheet so there's nothing. NOTHING!
function clearStyle(theStyle)
{
   theStyle.innerHTML = "";
   theStyle.appendChild(document.createTextNode("")); // WebKit hack :(
}

//Something I found online in case insertrule or addrule isn't available
function addCSSRule(sheet, selector, rules, index) 
{
   if("insertRule" in sheet) 
      sheet.insertRule(selector + "{" + rules + "}", index);
   else if("addRule" in sheet) 
      sheet.addRule(selector, rules, index);
}

//Loads the given JS into the DOM.
function loadJS(url)
{
   var script = document.createElement("script");
   script.type = "text/javascript";
   script.src = url;
   document.body.appendChild(script);
}

//Pads time with 0 so it's not stupid
function padTime(value)
{
   return ("00" + value).slice(-2);
}

//Get a variable or the given default value if it doesn't exist.
function getOrDefault(variable, defaultValue)
{
   return typeof variable === 'undefined' ? getOrDefault(defaultValue, false) : variable;
}

inputStatus = {
   NONE : 1,
   ERROR : 2,
   RUNNING : 3,
   SUCCESS : 4,
};

//A generic function that should be called whenever the status should be set.
function setInputStatus(element, theStatus, message)
{
   //Oops, this shouldn't happen
   if(!(element && element.nodeType))
      return false;

   //Defaultio made me do this!
   if(theStatus === inputStatus.RUNNING)
      element.disabled = true;
   else
      element.disabled = false;

   message = getOrDefault(message, "");

   element.setAttribute("title", message);

   //Set some garbage based on the status of the input
   if(theStatus === inputStatus.ERROR)
   {
     element.setAttribute("data-status", "ERROR"); 
     //element.innerHTML = "ERR";
   }
   else if (theStatus === inputStatus.RUNNING)
   {
      element.setAttribute("data-status", "RUNNING");
      //element.innerHTML = "RUN";
   }
   else if (theStatus === inputStatus.SUCCESS)
   {
      element.setAttribute("data-status", "SUCCESS");
      //element.innerHTML = "OK!";
   }
   else
   {
      element.setAttribute("data-status", "");
      //element.innerHTML = "";
   }

   return true;
}

//This literally does everything for you.
function fullGenericXHR(page, formData, statusElement, successCallback, forcefull)
{
   setInputStatus(statusElement, inputStatus.RUNNING, "Submitting...");
   genericXHR(page, formData, statusElement, successCallback, forcefull);
}

function genericXHRSimple(page, callback)
{
   var xhr = new XMLHttpRequest();
   xhr.open("POST", page);

   //Use generic completion function with given success callback
   xhr.addEventListener("load", function(event) 
   {
      try
      {
         callback(event.target.response);
         //eval(event.target.response);
      }
      catch(e)
      {
         console.log("Oops, XHR callback didn't work. Dumping exception");
         console.log(e);
      }
   });
   xhr.send();
}

//OK, let's be real. Almost ALL the XHR requests look like this. The only
//difference is what we do on success really. This function will handle nearly
//ALL the dynamic request stuff for you; just supply the formdata and whatever.
function genericXHR(page, formData, statusElement, successCallback, forcefull, errorHandler)
{
   quietlog("Entered genericXHR for request: " + page);

   forcefull = getOrDefault(forcefull, false);

   //Oh, no XML stuff? OK, we'll use an iframe
   if(!canXHR())
   {
      alert("Your browser doesn't seem to support our submission process.");
      console.log("Browser doesn't support XHR?");
      return false;
      /*var iframe = document.createElement("iframe");
      iframe.src = page;*/
   }
   else
   {
      //First, update page to be small IF we're not doing debug
      if(!getQueryVariable("debug") && !forcefull)
      {
         //If we have a query string, append & instead of ?
         if(page.indexOf("?") >= 0)
            page += "&small=1";
         else
            page += "?small=1";
      }
      //if(page.indexOf("?") >=0)
      //page += "&session=" + document.cookie

      var xhr = new XMLHttpRequest();
      xhr.open("POST", page);

      quietlog("Initialized and opened the XHR");

      //Use generic completion function with given success callback
      xhr.addEventListener("load", function(event) 
      {
         genericComplete(event, statusElement, successCallback, errorHandler);
      });

      if(formData)
      {
         //TODO: THIS MAY BE EXTREMELY UNSAFE! IDK??!?!??!
         if(!formData.get("psession"))
            formData.append("psession", StorageUtilities.GetPHPSession());
         xhr.send(formData);
      }
      else
      {
         xhr.send();
      }

      quietlog("XHR send success?");
   }
}

//Almost all query completion code will look like this, so use this 
//generic callback where possible. It takes more parameters than the 
//normal "load" callback, so you have to wrap it 
function genericComplete(event, statusElement, successCallback, errorHandler)
{
   quietlog("XHR got a response!");

   var json;

   //If user didn't give us a successCallback, use the generic one
   successCallback = getOrDefault(successCallback, genericSuccess);

   try
   {
      json = JSON.parse(event.target.response);
   }
   catch(e)
   {
      setInputStatus(statusElement, inputStatus.ERROR, 
         "Internal error: Couldn't parse JSON! Response dumped to console");
      console.log("Couldn't parse JSON! Exception: " + e + ".Dumping response:");
      console.log(event.target.response);
      return;
   }

   if (json.result !== false) 
   {
      //quietlog("Dumping whole response: " + event.target.response);
      //success
      if(successCallback)
         successCallback(json, statusElement);

      quietlog("XHR finished successfully!");
   } 
   else 
   {
      if(json.errors)
      {
         //Just display first error (probably most important)
         setInputStatus(statusElement, inputStatus.ERROR, json.errors.join("\n"));
         console.log(json);

         //This should change in the future!
         json.errors.forEach(function(v, i, a) 
         {
            if(errorHandler)
               errorHandler(v);
            else if(i === 0)
               alert(v);

            console.log(v);
         });
      }
      else
      {
         console.log("No errors found in the returned JSON, but the result was false!");
      }
   }

   if(json.warnings)
   {
      json.warnings.forEach(function(v, i, a) { console.log("Warning: " + v); });
   }
}

//The generic action for a successful submit
function genericSuccess(json, statusElement)
{
   setInputStatus(statusElement, inputStatus.SUCCESS, "Complete!"); 
}

//Success that reloads a page
function reloadSuccess(json, statusElement)
{
   location.reload();
}

//Success that redirects to the result of the json
function redirectSuccess(json, statusElement)
{
   var newQuery = getQueryString(json.result);

   if(json.result.indexOf(window.location.pathname + 
      window.location.search) === 0 && newQuery ===
      window.location.search)
   {
      quietlog("page is the same, so reloading");
      location.reload();
   }
   else
   {
      quietlog("redirecting to: " + json.result);
      window.location.href = json.result;
   }
}

//----------------------------------------------------------------
//These functions suck.... I'll probably remove them at some point
//----------------------------------------------------------------

//Taken from stack overflow:
//http://stackoverflow.com/questions/4229043/load-page-content-to-variable
function loadXMLDoc(theURL, callback, post)
{
   post = typeof post !== 'undefined' ? post : false;
   var xmlhttp;

   if (window.XMLHttpRequest)
   {// code for IE7+, Firefox, Chrome, Opera, Safari, SeaMonkey
      xmlhttp=new XMLHttpRequest();
   }
   else
   {// code for IE6, IE5
      xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
   }
   xmlhttp.onreadystatechange=function()
   {
      if (xmlhttp.readyState==4 && xmlhttp.status==200)
      {
         callback(xmlhttp.responseText);
      }
   };

   if(post)
   {
      //First, make sure the URL is even post worthy. If it's not,
      //simply call our function again as get.
      var parts = theURL.split("?");
      if (parts.length != 2)
         return loadXMLDoc(theURL, callback);

      var params = parts[1];
      xmlhttp.open("POST", parts[0], true);

      xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

      xmlhttp.send(params);
   }
   else
   {
      xmlhttp.open("GET", theURL, true);
      xmlhttp.send();
   }
}

//Taken from stackoverflow: 
//http://stackoverflow.com/questions/133925/javascript-post-request-like-a-form-submit
function post(path, params, method) 
{
   method = method || "post"; // Set method to post by default if not specified.

   // The rest of this code assumes you are not using a library.
   // It can be made less wordy if you use one.
   var form = document.createElement("form");
   form.setAttribute("method", method);
   form.setAttribute("action", path);

   for(var key in params) 
   {
      if(params.hasOwnProperty(key)) 
      {
         var hiddenField = document.createElement("input");
         hiddenField.setAttribute("type", "hidden");
         hiddenField.setAttribute("name", key);
         hiddenField.setAttribute("value", params[key]);

         form.appendChild(hiddenField);
      }
   }

   document.body.appendChild(form);
   form.submit();
}

/*function writeStorage(name, value)
{
   localStorage.setItem(name, JSON.stringify(value));
}

function readStorage(name)
{
   try
   {
      return JSON.parse(localStorage.getItem(name));
   }
   catch(error)
   {
      console.log("Failed to retrieve " + name + " from local storage");
      return false;
   }
}*/

function writePersistent(name, value, callback)
{
   var data = new FormData();
   data.append("name", name);
   data.append("value", JSON.stringify(value));
   genericXHR("/query/submit/varstore?session=" + StorageUtilities.GetPHPSession(), 
      data, null, function(json, element)
      {
         genericSuccess(json, element); 
         if(callback) callback(name);
      });
}

function readPersistent(name, onComplete)
{
   var data = new FormData();
   data.append("name", name);
   RequestUtilities.XHRSimple("/query/submit/varstore?session=" + StorageUtilities.GetPHPSession(),
      function(response)
      {
         var json = JSON.parse(response);
         try
         {
            var result = json.result;
            if(!result)
            {
               console.log("Variable " + name + " does not exist!");
               onComplete(undefined);
            }
            else
            {
               onComplete(JSON.parse(result));
            }
         }
         catch(error)
         {
            console.log("Couldn't parse variable from varstore: " + json.result);
            console.log(error);
         }
      }, data);
   /*genericXHR("/query/submit/varstore?session=" + StorageUtilities.GetPHPSession(), 
      data, null, function(json, status)
      {
         try
         {
            onComplete(JSON.parse(json.result));
         }
         catch(error)
         {
            console.log("Couldn't parse variable from varstore: " + json.result);
         }
      });*/
}

function setUIScale(settingKey)
{
   var htmlElement = document.documentElement;
   var UIPercent = 100;

   //console.log("Doing scale. Setting: " + settingKey + ", value: " + readStorage(settingKey));
   switch(readStorage(settingKey))
   {
      case "extra small":
         UIPercent = 70; break;
      case "small":
         UIPercent = 85; break;
      case "normal":
         UIPercent = 100; break;
      case "large":
         UIPercent = 115; break;
      case "extra large":
         UIPercent = 130; break;
   }

   //console.log("Setting UI to " + UIPercent);

   //if(UIPercent !== 100)
   htmlElement.style.fontSize = UIPercent + "%";
}

//Taken from http://jsfiddle.net/Znarkus/Z99mK/
function insertAtCursor(myField, replaceText, startText, endText) 
{
   startText = getOrDefault(startText, "");
   endText = getOrDefault(endText, "");
   replaceText = getOrDefault(replaceText, "");

   //IE support
   if (document.selection) 
   {
      myField.focus();
      sel = document.selection.createRange();

      if(!replaceText)
         replaceText = sel.text;

      sel.text = startText + replaceText + endText;
   }
   //MOZILLA and others
   else if (myField.selectionStart || myField.selectionStart == '0')
   {
      var startPos = myField.selectionStart;
      var endPos = myField.selectionEnd;
      var selectedText = myField.value.substring(startPos, endPos);

      if(!replaceText)
         replaceText = selectedText;

      myField.value = myField.value.substring(0, startPos) + 
         startText + replaceText + endText +
         myField.value.substring(endPos, myField.value.length);

      if(startText)
         myField.selectionStart = startPos + startText.length; 
      else
         myField.selectionStart = startPos + replaceText.length;

      myField.selectionEnd = myField.selectionStart;
   }
   else
   {
      if(!replaceText)
         replaceText = "";

      myField.value += startText + replaceText + endText;
   }
}

//These manage a (hopefully stylized) form for deletion events.
function buildDeleteForm(title, idtype, idvalue, page)
{
   var oldForm = document.getElementById("deleteForm");

   if(oldForm)
      oldForm.parentNode.removeChild(oldForm);

   var form = document.createElement("form");
   form.setAttribute("id", "deleteForm");
   form.setAttribute("data-page", page);
   form.addEventListener("submit", submitDelete);
   
   var header = document.createElement("h3");
   header.innerHTML = title;

   var deleteIdentifier = document.createElement("input");
   deleteIdentifier.setAttribute("type", "hidden");
   deleteIdentifier.setAttribute("name", "delete");
   deleteIdentifier.setAttribute("value", 1);

   var fpid = document.createElement("input");
   fpid.setAttribute("type", "hidden");
   fpid.setAttribute("name", idtype);
   fpid.setAttribute("value", idvalue);

   var reason = document.createElement("input");
   reason.setAttribute("type", "text");
   reason.setAttribute("name", "reason");
   reason.setAttribute("maxlength", 90);
   reason.setAttribute("placeholder", "Give a short reason for the deletion");
   reason.required = true;

   var cancel = document.createElement("button");
   cancel.setAttribute("type", "button");
   cancel.innerHTML = "Cancel";
   cancel.addEventListener("click", cancelDelete);

   var submit = document.createElement("button");
   submit.setAttribute("type", "submit");
   submit.setAttribute("id", "deletePostSubmit");
   submit.innerHTML = "Delete";

   form.appendChild(header);
   form.appendChild(deleteIdentifier);
   form.appendChild(fpid);
   form.appendChild(reason);
   form.appendChild(cancel);
   form.appendChild(submit);

   //document.getElementsByTagName("section")[0].appendChild(form);
   document.querySelector("main > section:not(.headerad)").appendChild(form);
   console.log("Delete form appended to page");
}

function cancelDelete(event)
{
   var result = false;

   if(event.target.parentNode)
   {
      if(event.target.parentNode.parentNode)
      {
         event.target.parentNode.parentNode.removeChild(event.target.parentNode);
         result = true;
      }
   }

   if(!result)
      console.log("Couldn't remove delete dialog!");
   else
      console.log("Delete form removed");
}

function submitDelete(event)
{
   event.preventDefault();

   var deleteButton = document.getElementById("deletePostSubmit");
   var form = event.target;
	var data = new FormData(form);
   var page = event.target.getAttribute("data-page");

   //Tell the user we're submitting (so they know it's doing something)
   setInputStatus(deleteButton, inputStatus.RUNNING, "Deleting...");
	
   //Perform the delete, redirecting to the result.
   genericXHR(page, data, deleteButton, redirectSuccess);
}

function canXHR()
{
   return (typeof window.XMLHttpRequest !== "undefined" && 
      typeof window.FormData !== "undefined");
}

var MyKeyCodes =
{
   "Left" : 37,
   "Up" : 38,
   "Right" : 39,
   "Down" : 40
};

var BBCodeToolSets =
{
   "general" : 1,
   "headers" : 2,
   "anchors" : 3
};

//Insert given bbcode around selected text. 
////NOTE: THIS IS DEPRECATED!
/*function bbcodeInsert(code, element)
{
   insertAtCursor(element, false, "[" + code + "]", "[/" + code + "]");
   element.focus();
}*/

//A small object to easily hold a quick bbcode button.
function bbcodeButton(innerHTML, bbcode, toolSet)
{
   this.inner = innerHTML;
   this.bbcode = bbcode;
   this.toolSet = toolSet;
}

//Retrieve the bbcode as an opening tag
bbcodeButton.prototype.openTag = function()
{
   return "[" + this.bbcode + "]";
};

//Retrieve the bbcode as a closing tag
bbcodeButton.prototype.closeTag = function()
{
   return "[/" + this.bbcode + "]";
};

//Get a new button which does not cause a form to submit.
function makeUnsubmittableButton()
{
   var button = document.createElement('button');
   button.setAttribute("type", "button");
   return button;
}

function createBBCodeTool(innerHTML, openTag, closeTag, element)
{
   var tool = makeUnsubmittableButton();
   tool.innerHTML = innerHTML;
   tool.addEventListener("click", function()
   {
      insertAtCursor(element, false, openTag, closeTag);
      element.focus();
   });
   return tool;
}

function attachBBCodeTools(element, textArea, toolSets)
{
   toolSets = getOrDefault(toolSets, [ BBCodeToolSets.general ]);

   if(!textArea)
      return;

   var toolBox = document.createElement("bbcode-tools");
   var quickButtons = [ 
      new bbcodeButton("<strong>B</strong>", "b", BBCodeToolSets.general),
      new bbcodeButton("<em>It</em>", "i", BBCodeToolSets.general),
      new bbcodeButton("<u>U</u>", "u", BBCodeToolSets.general),
      new bbcodeButton("<del>S</del>", "s", BBCodeToolSets.general),
      new bbcodeButton("<span>T<sup>s</sup></span>", "sup", BBCodeToolSets.general),
      new bbcodeButton("<span>T<sub>s</sub></span>", "sub", BBCodeToolSets.general),
      new bbcodeButton("<a href=\"\" onclick=\"return false;\">URL</a>", 
         "url", BBCodeToolSets.general),
      //new bbcodeButton("📷", "img", BBCodeToolSets.general),
      new bbcodeButton("►", "youtube", BBCodeToolSets.general),
      new bbcodeButton("<code>CODE</code>", "code", BBCodeToolSets.general),
      new bbcodeButton("<inline-code>ICODE</inline-code>", "icode", BBCodeToolSets.general),
      new bbcodeButton("H1", "h1", BBCodeToolSets.headers),
      new bbcodeButton("H2", "h2", BBCodeToolSets.headers),
      new bbcodeButton("H3", "h3", BBCodeToolSets.headers),
      new bbcodeButton("Anchor", "anchor", BBCodeToolSets.anchors),
      new bbcodeButton("Spoiler", "spoiler", BBCodeToolSets.general)
   ];

   for(var i = 0; i < quickButtons.length; i++)
   {
      if(toolSets.indexOf(quickButtons[i].toolSet) >= 0)
      {
         toolBox.appendChild(createBBCodeTool(quickButtons[i].inner,
            quickButtons[i].openTag(), quickButtons[i].closeTag(), textArea));
      }
   }

   //Insert the custom general bbcode thing.
   if(toolSets.indexOf(BBCodeToolSets.general) >= 0)
   {
      toolBox.appendChild(createBBCodeTool("●List", 
         "[list]\n", "[*]Item 1\n[*]Item 2\n[/list]", textArea));

      var pollTool = makeUnsubmittableButton();
      pollTool.innerHTML = '✓Poll';
      pollTool.addEventListener("click", showPollTool.callBind(pollTool, textArea));
      toolBox.appendChild(pollTool);

      var imageTool = makeUnsubmittableButton();
      imageTool.innerHTML = '📷';
      imageTool.addEventListener("click", showImageTool.callBind(imageTool, textArea));
      toolBox.appendChild(imageTool);
   }

   //The entire next section is all about the preview button. Pressing it will
   //create a view of what your post might look like.
   var preview = makeUnsubmittableButton();
   preview.innerHTML = "Preview";
   preview.addEventListener("click", function()
   {
      var data = new FormData();
      data.append("content", htmlEscape(textArea.value));

      if(toolSets.indexOf(BBCodeToolSets.headers))
         data.append("extended", 1);

      fullGenericXHR("/query/request/genbbcode", data, preview, function(json, element)
      {
         setInputStatus(element, inputStatus.NONE, "");

         var oldPreviews = toolBox.querySelectorAll("bbcode-preview");

         for(var i = 0; i < oldPreviews.length; i++)
            oldPreviews[i].parentNode.removeChild(oldPreviews[i]);

         var output = document.createElement("bbcode-preview");
         var outputClear = makeUnsubmittableButton();
         output.className = "bbcode";
         output.innerHTML = json.result;
         outputClear.innerHTML = "Clear Preview";
         outputClear.setAttribute("class", "clear");
         outputClear.addEventListener("click", function()
         {
            output.parentNode.removeChild(output);
         });
         applyGeneratedContent(output);
         output.appendChild(outputClear);
         toolBox.appendChild(output);
      });

   });
   toolBox.appendChild(preview);

   element.insertBefore(toolBox, textArea);
}

function pollToolID() { return "bbcodePollTool"; }
function imageToolID() { return "bbcodeImageTool"; }

function showImageTool(imageButton, textArea)
{
   //if the user clicked the imag tool when there's already an image tool, stop executing.
   if(hideBBCodeTool(document.getElementById(imageToolID())))
      return;

   var imageTool = document.createElement("image-tool");
   var urlForm = document.createElement("form");
   var urlSelector = document.createElement("input");
   var urlSubmit = document.createElement("button");
   var imageForm = document.createElement("form");
   var imageSelector = document.createElement("input");
   var imageSubmit = document.createElement("button");
   var cancelButton = makeUnsubmittableButton();

   imageTool.id = imageToolID();
   cancelButton.innerHTML = "Cancel";
   cancelButton.className = "cancel";
   urlSelector.setAttribute("placeholder", "Image URL");
   imageSelector.setAttribute("type", "file");
   imageSelector.setAttribute("name", "image");
   imageSelector.setAttribute("accept", "image/*");
   urlSubmit.innerHTML = "Add URL image";
   imageSubmit.innerHTML = "Add file image";

   imageForm.addEventListener("submit", function(e)
   {
      e.preventDefault();
      var data = new FormData(e.target);
      var request = new XMLHttpRequest();
      request.open("POST", window.location.protocol + "//kland.smilebasicsource.com/uploadimage", true);
      request.addEventListener("load", function(e)
      {
         if(request.status === 200)
            completeImageTool(e.target.response, textArea, imageTool);
         else
            setInputStatus(imageSubmit, inputStatus.ERROR);
      });
      setInputStatus(imageSubmit, inputStatus.RUNNING);
      request.send(data);
   });
   urlForm.addEventListener("submit", function(e)
   {
      e.preventDefault();
      completeImageTool(urlSelector.value, textArea, imageTool);
   });
   cancelButton.addEventListener("click", hideBBCodeTool.callBind(imageTool));

   urlForm.appendChild(urlSelector);
   urlForm.appendChild(urlSubmit);
   imageForm.appendChild(imageSelector);
   imageForm.appendChild(imageSubmit);
   imageTool.appendChild(urlForm);
   imageTool.appendChild(imageForm);
   //imageTool.appendChild(cancelButton);

   insertAfter(imageButton.parentNode, imageTool, imageButton.parentNode.querySelector("button:last-of-type"));
}

function completeImageTool(url, textArea, imageTool)
{
   insertAtCursor(textArea, url, "[img]", "[/img]");
   textArea.focus();
   hideBBCodeTool(imageTool);
}

function showPollTool(pollButton, textArea)
{
   //if the user clicked the poll tool when there's already a poll tool, stop executing.
   if(hideBBCodeTool(document.getElementById(pollToolID())))
      return;

   var pollTool = document.createElement("poll-tool");
   var pollTitle = document.createElement("input");
   var pollOptions = document.createElement("textarea");
   var pollHidden = document.createElement("input");
   var pollHiddenLabel = document.createElement("label");
   var pollMultivote = document.createElement("input");
   var pollMultivoteLabel = document.createElement("label");
   var submitPoll = document.createElement("button");
   var cancelTool = document.createElement("button");
   var pollNotes = document.createElement("p");

   //Poll inputs
   pollTool.id = pollToolID();
   pollTitle.setAttribute("name", "title");
   pollTitle.setAttribute("placeholder", "Poll title");
   pollTitle.setAttribute("required", "true");
   pollOptions.setAttribute("name", "options");
   pollOptions.setAttribute("placeholder", "Poll options (one per line)");
   pollOptions.setAttribute("required", "true");
   pollHidden.setAttribute("type", "checkbox");
   pollHidden.setAttribute("name", "hiddenresults");
   pollHiddenLabel.appendChild(pollHidden);
   pollHiddenLabel.innerHTML += "Hide results until closed";
   pollMultivote.setAttribute("type", "checkbox");
   pollMultivote.setAttribute("name", "multivote");
   pollMultivoteLabel.appendChild(pollMultivote);
   pollMultivoteLabel.innerHTML += "Allow users to select multiple options";

   //Poll controls
   cancelTool.innerHTML = "Cancel";
   cancelTool.setAttribute("type", "button");
   cancelTool.addEventListener("click", hideBBCodeTool.callBind(pollTool));
   submitPoll.innerHTML = "Generate";
   submitPoll.setAttribute("type", "button");
   submitPoll.setAttribute("data-generate", "true");
   submitPoll.addEventListener("click", generatePoll.callBind(pollTool,textArea));
   pollNotes.innerHTML = "After poll is generated, a poll code will be inserted into " +
      "your post. Use this code anywhere you want to display the poll";

   pollTool.appendChild(pollTitle);
   pollTool.appendChild(pollOptions);
   pollTool.appendChild(pollHiddenLabel);
   pollTool.appendChild(pollMultivoteLabel);
   pollTool.appendChild(cancelTool);
   pollTool.appendChild(submitPoll);
   pollTool.appendChild(pollNotes);

   insertAfter(pollButton.parentNode, pollTool, pollButton.parentNode.querySelector("button:last-of-type"));
}

function hideBBCodeTool(tool)
{
   if(tool)
   {
      tool.parentNode.removeChild(tool);
      console.log("Hid the bbcode tool");
      return true;
   }
   else
   {
      console.log("Yo, there wasn't a bbcode tool to hide");
      return false;
   }
}

function generatePoll(pollTool, textArea)
{
   if(pollTool)
   {
      var formData = new FormData();
      var pollTitle = pollTool.querySelector('[name="title"]');
      var pollOptions = pollTool.querySelector('[name="options"]');
      var pollHidden = pollTool.querySelector('[name="hiddenresults"]');
      var pollMultivote = pollTool.querySelector('[name="multivote"]');

      if(pollTitle && pollOptions && pollHidden)
      {
         var optionArray = pollOptions.value.split("\n");

         formData.append("title", pollTitle.value);

         if(pollHidden.checked)
            formData.append("hiddenresults", 1);
         if(pollMultivote.checked)
            formData.append("multivote", 1);

         formData.append("options", JSON.stringify(optionArray));

         console.log(formData);
         console.log(pollTitle.value);

         fullGenericXHR("/query/submit/poll", formData, pollTool.querySelector('button[data-generate]'), 
            function(json, element)
            {
               genericSuccess(json, element);

               insertAtCursor(textArea, false, "[poll=p" + json.result + "]", "[/poll]");
               textArea.focus();

               hideBBCodeTool(pollTool);
            });
      }
      else
      {
         console.log("Couldn't find the poll title or options!");
      }
   }
   else
   {
      console.log("Yo, there wasn't a poll tool to generate data from!");
   }
}

function fixUnsupportedFeatures(element)
{
   element = getOrDefault(element, document.documentElement);

   //ONLY browsers with badness AND users with
   if(!isPropertySupported("image-rendering"))
   {
      var images = element.querySelectorAll("img[data-pixelart]");
      var i, j;

      quietlog(images.length + " images are labelled as pixel art and are " +
         "being converted due to unsupported features");

      for(i = 0; i < images.length; i++)
      {
         //var imageStyle = getComputedStyle(images[i]);
         if(images[i].clientWidth === 0 || images[i].clientHeight === 0)
            continue;

         var canvas = document.createElement("canvas");
         var context = canvas.getContext("2d");
         canvas.width = images[i].clientWidth;
         canvas.height = images[i].clientHeight;
         for(j = 0; j < images[i].attributes.length; j++)
         {
            canvas.setAttribute(images[i].attributes[j].nodeName, 
               images[i].attributes[j].nodeValue);
         }
         context.imageSmoothingEnabled = false;
         context.webkitImageSmoothingEnabled = false;
         context.mozImageSmoothingEnabled = false;
         context.msImageSmoothingEnabled = false;
         context.drawImage(images[i], 0, 0, images[i].clientWidth, images[i].clientHeight);
         replaceNode(images[i], canvas);
      }
   }
}

function applyGeneratedContent(element)
{
   var i;

   //VERY first, convert links to async images (if that's what they want)
   var asyncImages = element.querySelectorAll("[data-asyncimage]");
   
   for(i = 0; i < asyncImages.length; i++)
      asyncImages[i].src = asyncImages[i].dataset.src;

   //Second, fix up the polls
   var polls = element.querySelectorAll("generate-poll");

   for(i = 0; i < polls.length; i++)
   {
      if(!polls[i].dataset.id)
         continue;

      var pollID = polls[i].dataset.id.slice(1);

      if(Number(pollID) > 0)
      {
         var encodedLink = Base64.encode(window.location.pathname + window.location.search + window.location.hash);

         fullGenericXHR("/query/submit/poll?pid=" + pollID + "&link=" + encodedLink,
            null, polls[i], generatePollElement);
      }
   }

   //Next, fix up the youtube videos
   var youtubes = element.querySelectorAll("youtube-player");

   for(i = 0; i < youtubes.length; i++)
      generateYoutube(youtubes[i]);

   //Now collapse deep quotes
   var deepQuotes = element.querySelectorAll(".bbcode > q > q > q > q > q");
   var quoteCollapseElement = element.querySelector("[data-quotecollapse]");

   if(quoteCollapseElement && quoteCollapseElement.getAttribute("data-quotecollapse"))
   {
      for(i = 0; i < deepQuotes.length; i++)
      {
         //Only wrap top level quotes (if they have something in them).
         /*if()
            {*/
            var container = deepQuotes[i].parentNode;
         var section = document.createElement("spoiler-section");
         var button = document.createElement("button");
         var content = document.createElement("spoiler-content");
         button.setAttribute("data-spoiler", "");
         button.innerHTML = "Show Quotes";
         content.appendChild(deepQuotes[i]);
         section.appendChild(button);
         section.appendChild(content);
         container.appendChild(section);
         //}
      }
   }

   //Fix spoilers
   var unfixedSpoilers = element.querySelectorAll("spoiler-content");

   for(i = 0; i < unfixedSpoilers.length; i++)
   {
      if(unfixedSpoilers[i].parentNode.tagName !== "SPOILER-SECTION")
      {
         var spoilerSection = document.createElement("spoiler-section");
         var spoilerButton = document.createElement("button");
         var possibleText = unfixedSpoilers[i].getAttribute('data-text');

         if(!possibleText)
            possibleText = "spoiler";

         unfixedSpoilers[i].parentNode.insertBefore(spoilerSection, unfixedSpoilers[i]);

         spoilerButton.setAttribute("data-spoiler", "");
         spoilerButton.innerHTML = "Show " + possibleText;

         spoilerSection.appendChild(spoilerButton);
         spoilerSection.appendChild(unfixedSpoilers[i]);
      }
   }

   var spoilerButtons = element.querySelectorAll("spoiler-section [data-spoiler]");

   for(i = 0; i < spoilerButtons.length; i++)
      spoilerButtons[i].addEventListener("click", spoilerToggle, true);

   //Now remove transparency for things marked for that.
   var opaqueThings = element.querySelectorAll("[data-fullopaque]");

   for(i = 0; i < opaqueThings.length; i++)
   {
      var color = getComputedStyle(opaqueThings[i]).backgroundColor;
      var matches = color.match(/rgba.*,\s*([\.0-9]+\s*\))/);

      if(matches)
         opaqueThings[i].style.backgroundColor = color.replace(matches[1], "1.0)");
   }

   //Code block syntax highlighting
   var codeBlocks = element.querySelectorAll(".bbcode code");
   for(i = 0; i < codeBlocks.length; i++)
   {
      applySyntaxHighlighting(codeBlocks[i]);      
   }
}

function generatePollElement(json, element)
{
   setInputStatus(element, inputStatus.NONE);   

   var i;
   var poll = document.createElement("user-poll");
   var pollTitle = document.createElement("poll-title");
   var pollOptions= document.createElement("poll-options");
   var pollCreator = document.createElement("poll-creator");
   var pollCreatorLink = document.createElement("a");
   var pollTime = document.createElement("time");
   var pollClose = document.createElement("button");
   var pollStatus = document.createElement("poll-status");
   var pollVotes = document.createElement("poll-votes");
   var pollRestrictions = document.createElement("poll-restrictions");

   pollTitle.setAttribute("data-originaltitle", json.result.title);

   if(json.result.link)
   {
      var pollLink = document.createElement("a");
      pollLink.href = json.result.link;
      pollLink.innerHTML = json.result.title;
      pollTitle.appendChild(pollLink);
   }
   else
   {
      pollTitle.innerHTML = json.result.title;
   }

   poll.setAttribute("data-pid", json.result.pid);
   pollOptions.setAttribute("tabindex", "-1");
   pollCreatorLink.innerHTML = json.result.creator.username;
   pollCreatorLink.href = "/user?uid=" + json.result.creator.uid;
   pollCreatorLink.className = "userhover";
   pollCreator.innerHTML = "Poll #" + json.result.pid + " by ";
   pollCreator.appendChild(pollCreatorLink);
   /*pollID.innerHTML = "#" + json.result.pid;*/
   pollTime.innerHTML = json.result.createdago + " ago";
   pollTime.setAttribute("datetime", json.result.createdon);
   pollVotes.innerHTML = json.result.totalvotes + " votes";
   pollClose.className = "pollClose";
   pollClose.innerHTML = json.result.closed ? "Reopen Poll" : "Close Poll";
   pollClose.addEventListener("click", 
      closePoll.callBind(json.result.closed ? 0 : 1, json.result.pid, poll));

   if(json.result.closed)
   {
      pollRestrictions.innerHTML = "Closed";
      pollRestrictions.setAttribute("data-alert", "");
   }
   else if (json.result.hiddenresults)
   {
      pollRestrictions.innerHTML = "Results hidden";
   }

   if(json.result.multivote && json.result.canvote)
   {
      var voteButton = document.createElement("button");
      voteButton.innerHTML = "Vote"; //TODO : LANGUAGE
      voteButton.addEventListener("click", submitPollVotes);
      pollStatus.appendChild(voteButton);
   }

   if(pollRestrictions.innerHTML)
      pollStatus.appendChild(pollRestrictions);

   pollStatus.appendChild(pollVotes);

   if(json.result.multivote)
   {
      var pollUsers = document.createElement("poll-users");
      pollUsers.innerHTML = json.result.totalusers + " user" +
         (json.result.totalusers > 1 ? "s" : "");
      pollStatus.appendChild(pollUsers);
   }

   poll.appendChild(pollTitle);

   if(json.result.closed && json.result.canopen ||
      !json.result.closed && json.result.canclose)
   {
      poll.appendChild(pollClose);
   }
   /*poll.appendChild(pollID);*/

   /*var maxVoteCount = 0;
   for(i = 0; i < json.result.options.length; i++)
      if(json.result.options[i].votes > maxVoteCount)
         maxVoteCount = json.result.options[i].votes;*/

   for(i = 0; i < json.result.options.length; i++)
   {
      var pollOption = document.createElement("poll-option");
      var pollOptionControl = document.createElement("option-control");
      var pollVote = document.createElement("a");
      var pollVoted = document.createElement("user-voted");
      var optionVotes = document.createElement("option-votes");
      var optionInfo = document.createElement("option-info");
      var optionContent = document.createElement("option-content");
      var optionVisual = document.createElement("option-visual");

      pollVote.innerHTML = "✓";
      pollVote.setAttribute("data-poid", json.result.options[i].poid);
      pollOption.setAttribute("data-poid", json.result.options[i].poid);
      if(json.result.multivote)
         pollVote.addEventListener("click", selectPollVote);
      else
         pollVote.addEventListener("click", submitPollVote);
      pollVoted.innerHTML = "✓";
      optionVotes.innerHTML = json.result.options[i].votes;
      optionContent.innerHTML = json.result.options[i].content;

      //I KNOW there's a field called "hiddenresults", but that's actually just
      //telling you if the results are hidden IN GENERAL. Whether or not
      //they're hidden now may be due to various factors, so we check the
      //actual vote count for hiddenness instead.
      if(json.result.options[i].votes >= 0 && json.result.totalvotes > 0)
      {
         optionVisual.style.width = Math.floor(100 * json.result.options[i].votes / json.result.totalusers) + "%";
         optionInfo.appendChild(optionVisual);
         optionInfo.appendChild(optionVotes);
      }

      optionInfo.appendChild(optionContent);

      if(json.result.canvote)
      {
         pollOptionControl.appendChild(pollVote);
      }
      else if (json.result.options[i].uservoted)
      {
         pollOptionControl.appendChild(pollVoted);
         optionVisual.setAttribute("data-voted", "");
      }

      pollOption.appendChild(pollOptionControl);
      pollOption.appendChild(optionInfo);

      pollOptions.appendChild(pollOption);
   }

   poll.appendChild(pollOptions);
   poll.appendChild(pollStatus);


   poll.appendChild(pollCreator);
   poll.appendChild(pollTime);

   replaceNode(element, poll);
   reanchor();
}

function closePoll(close, pid, element)
{
   var data = new FormData();
   data.append("close", close);

   fullGenericXHR("/query/submit/poll?pid=" + pid, data, element, function(json, element) 
   {
      fullGenericXHR("/query/submit/poll?pid=" + pid, null, element, generatePollElement);
   });
}

function selectPollVote(event)
{
   var option = findParentWithTag("poll-option", event.target);

   if(option.dataset.selected)
      option.removeAttribute("data-selected");
   else
      option.setAttribute("data-selected", "true");
}

function submitPollVotes(event)
{
   var i;
   var poll = findParentWithTag("user-poll", event.target);
   var pollTitle = poll.querySelector("poll-title");
   var selectedOptions = poll.querySelectorAll("poll-option[data-selected]");
   var selectedOptionsNames = poll.querySelectorAll("poll-option[data-selected] option-info option-content a");

   if(selectedOptions.length === 0)
   {
      alert("You must select at least one option!");
      return;
   }
   else if (selectedOptionsNames.length === 0)
   {
      selectedOptionsNames = poll.querySelectorAll("poll-option[data-selected] option-info option-content");
   }

   var output = "You are about to vote for the following options on poll \"" +
      pollTitle.dataset.originaltitle + "\":\n\n";

   for(i = 0; i < selectedOptionsNames.length; i++)
      output += selectedOptionsNames[i].innerHTML + "\n";

   output += "\nYou can only vote once. Is this what you want?";

   if(confirm(output))
   {
      var formData = new FormData();
      var votes = "";

      for(i = 0; i < selectedOptions.length; i++)
         votes += ((i !== 0) ? "," : "") + selectedOptions[i].dataset.poid;

      formData.append("poids", votes);

      fullGenericXHR("/query/submit/poll", formData, event.target, function(json, element)
      {
         fullGenericXHR("/query/submit/poll?pid=" + poll.dataset.pid, null, poll, generatePollElement);
      });
   }
}

function submitPollVote(event)
{
   var pollSearch = event.target;
   var poid = event.target.dataset.poid;
   var pollOption = false;

   //Look for the real main title thing
   while(pollSearch.tagName !== "USER-POLL" && pollSearch.tagName !== "BODY")
   {
      if(pollSearch.tagName === "POLL-OPTION")
         pollOption = pollSearch.querySelector("option-content");

      pollSearch = pollSearch.parentNode;
   }

   var pollTitle = pollSearch.querySelector("poll-title");

   if(pollSearch.tagName !== "USER-POLL" || !pollTitle || !pollOption)
   {
      console.log("Couldn't find the poll or title for voting!");
      return;
   }

   var pollOptionText = pollOption.innerHTML;

   //A VERY bad hack for auto generated contest polls
   if(pollOption.children.length >= 2 && pollOption.children[1].innerHTML)
      pollOptionText = pollOption.children[1].innerHTML;

   if(confirm("You're about to vote '" + pollOptionText + 
      "' on the poll: \n\n" + pollTitle.dataset.originaltitle + "\n\n" + 
      "Is this what you want?"))
   {
      var formData = new FormData();
      formData.append("poids", poid);

      fullGenericXHR("/query/submit/poll", formData, pollSearch, function(json, element)
      {
         fullGenericXHR("/query/submit/poll?pid=" + pollSearch.dataset.pid, null, pollSearch, generatePollElement);
      });
      console.log("User voted for option " + poid); 
   }
   else
   {
      console.log("User decided against voting");
   }
}

function generateYoutube(youtube)
{
   var iframe = document.createElement("iframe");
   var src = youtube.innerHTML.replace(/\[[^\]]+\]([^\[]+)\[[^\]]+\]/, "$1");
   src = src.replace(/.+\/(.+)$/, "$1");
   src = src.replace(/.+=(.+)$/, "$1");
   iframe.setAttribute("src","https://www.youtube-nocookie.com/embed/" + src);
   iframe.setAttribute("width","480");
   iframe.setAttribute("height","270");
   iframe.setAttribute("allowfullscreen", "");
   iframe.setAttribute("frameborder", "0");

   replaceNode(youtube, iframe);
   reanchor();
}

function HTMLunescape(string) 
{
	var elem = document.createElement("textarea");
	elem.innerHTML = string;
	return elem.value;
}

function htmlEscape(string)
{
   var wrapper = document.createElement("pre");
   var element = document.createTextNode(string); 
   wrapper.appendChild(element);
   return wrapper.innerHTML;
}

function spoilerToggle(e)
{
   e.preventDefault();
   var toggler = e.target;
   
   //Look for the real toggler!
   while(!toggler.hasAttribute("data-spoiler") && toggler.tagName !== "BODY")
      toggler = toggler.parentNode;

   var section = toggler;

   while(section.tagName !== "SPOILER-SECTION" && section.tagName !== "BODY")
      section = section.parentNode;

   if(!section || section.tagName === "BODY")
   {
      console.log("Bad spoiler section!");
      return;
   }

   setSpoilerState(section, !toggler.hasAttribute("data-show"));
}

//Set the actual spoiler state for the given overarching spoiler. 
//"spoiler" should be the "spoiler-section" element.
function setSpoilerState(spoiler, show)
{
   var i, filler;
   var content = spoiler.querySelector("spoiler-content");
   var toggler = spoiler.querySelector("[data-spoiler]");
   var ignoreOverflow = spoiler.hasAttribute("data-ignoreoverflow");

   if(!content)
   {
      console.log("No spoiler content!");
      return;
   }
   else if(!toggler)
   {
      console.log("No toggler element!");
      return;
   }

   //Show or hide the spoiler
   if(show) 
   {
      //Before you do ANYTHING else, hide all the other sibling spoilers within
      //the same spoiler group.
      if(spoiler.hasAttribute("data-togglegroup"))
      {
         var toggleGroupSpoilers = spoiler.parentNode.querySelectorAll(
         '[data-togglegroup="' + spoiler.dataset.togglegroup + '"]');

         //Now for each spoiler in the group, force it to hide!
         for(i = 0; i < toggleGroupSpoilers.length; i++)
            setSpoilerState(toggleGroupSpoilers[i], false);
      }

      if(ignoreOverflow)
      {
         quietlog("Ignore overflow. Set style");
         var matchID = "filler_" + Date.now();
         filler = createFillerForElement(spoiler);
         filler.id = matchID;
         spoiler.setAttribute("data-filler", matchID);
         spoiler.style.position = "absolute";
         insertAfter(spoiler.parentNode, filler, spoiler);

         if(!isSupportedBrowser() || spoiler.offsetLeft !== filler.offsetLeft || 
            spoiler.offsetTop !== filler.offsetTop)
         {
            console.log("Fixing weird shifting error");
            spoiler.style.left = filler.offsetLeft + "px";
            spoiler.style.top = filler.offsetTop + "px";
         }
      }

      if(toggler.innerHTML.indexOf("Show") === 0)
         toggler.innerHTML = toggler.innerHTML.replace(/\bShow\b/g, "Hide");
      toggler.setAttribute("data-show", "");
      content.setAttribute("data-show", "");
   }
   else
   {
      if(toggler.innerHTML.indexOf("Hide") === 0)
         toggler.innerHTML = toggler.innerHTML.replace(/\bHide\b/g, "Show");
      toggler.removeAttribute("data-show");
      content.removeAttribute("data-show");

      if(ignoreOverflow)
      {
         quietlog("Ignore overflow. Remove style");
         spoiler.removeAttribute("style");
         filler = document.getElementById(spoiler.getAttribute("data-filler"));

         if(filler)
            removeSelf(filler);
      }
   }
}

function createFillerForElement(element)
{
   var elementStyle = getComputedStyle(element);
   filler = document.createElement("div");
   filler.style.display = elementStyle.display;
   filler.style.width = element.offsetWidth + "px";
   filler.style.height = element.offsetHeight + "px";

   return filler;
}

//Original code created by Fusselwurm:
//https://gist.github.com/Fusselwurm/4673695
//Adapted to work on any system which does not support querySelectorelector
(function () {
   var styleElement = document.createElement("style");
   clearStyle(styleElement);
   document.head.appendChild(styleElement);
   var style = styleElement.sheet;
   var select = function (selector, maxCount) 
   {
      var all = document.all,
      l = all.length, 
      i,
      resultSet = [];

      style.addRule(selector, "foo:bar");
      for (i = 0; i < l; i += 1)
      {
         if (all[i].currentStyle.foo === "bar")
         {
            resultSet.push(all[i]);
            if (resultSet.length > maxCount)
            {
               break;
            }
         }
      }
      style.removeRule(0);
      return resultSet;
   };

   if (document.querySelectorAll || document.querySelector) 
   {
      quietlog("Browser supports querySelector?");
      return;
   }

   document.querySelectorAll = function (selector) {
      return select(selector, Infinity);
   };
   document.querySelector = function (selector) {
      return select(selector, 1)[0] || null;
   };
   console.log("Set custom querySelector functions");
})();

if(!FormData.prototype.get)
{
   FormData.appendOld=FormData.prototype.append;
   FormData.prototype._fd={};
   FormData.prototype.append=function(k,v)
   {
      this._fd[k]=v;
      FormData.appendOld.apply(this,[k,v]);
   };
   FormData.prototype.get=function(k){return this._fd[k];};
}


// ---------------------------------------
// ------------ LZ-STRING.MIN.JS ---------
// ---------------------------------------


var LZString=function(){function o(o,r){if(!t[o]){t[o]={};for(var n=0;n<o.length;n++)t[o][o.charAt(n)]=n}return t[o][r]}var r=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",t={},i={compressToBase64:function(o){if(null==o)return"";var r=i._compress(o,6,function(o){return n.charAt(o)});switch(r.length%4){default:case 0:return r;case 1:return r+"===";case 2:return r+"==";case 3:return r+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(e){return o(n,r.charAt(e))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(o){return null==o?"":""==o?null:i._decompress(o.length,16384,function(r){return o.charCodeAt(r)-32})},compressToUint8Array:function(o){for(var r=i.compress(o),n=new Uint8Array(2*r.length),e=0,t=r.length;t>e;e++){var s=r.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null===o||void 0===o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;t>e;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(o){return null==o?"":i._compress(o,6,function(o){return e.charAt(o)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(n){return o(e,r.charAt(n))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(o,r,n){if(null==o)return"";var e,t,i,s={},p={},u="",c="",a="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<o.length;i+=1)if(u=o.charAt(i),Object.prototype.hasOwnProperty.call(s,u)||(s[u]=f++,p[u]=!0),c=a+u,Object.prototype.hasOwnProperty.call(s,c))a=c;else{if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++),s[c]=f++,a=String(u)}if(""!==a){if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==r-1){d.push(n(m));break}v++}return d.join("")},decompress:function(o){return null==o?"":""==o?null:i._decompress(o.length,32768,function(r){return o.charCodeAt(r)})},_decompress:function(o,n,e){var t,i,s,p,u,c,a,l,f=[],h=4,d=4,m=3,v="",w=[],A={val:e(0),position:n,index:1};for(i=0;3>i;i+=1)f[i]=i;for(p=0,c=Math.pow(2,2),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(t=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 2:return""}for(f[3]=l,s=l,w.push(l);;){if(A.index>o)return"";for(p=0,c=Math.pow(2,m),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(l=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 2:return w.join("")}if(0==h&&(h=Math.pow(2,m),m++),f[l])v=f[l];else{if(l!==d)return null;v=s+s.charAt(0)}w.push(v),f[d++]=s+v.charAt(0),h--,s=v,0==h&&(h=Math.pow(2,m),m++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module&&(module.exports=LZString);


// -----------------------------------------------
// ----------- CHATDRAW.JS -----------------------
// -----------------------------------------------


//Carlos Sanchez - 2016
//randomouscrap98@aol.com
//-Yo, check it out. Drawing. In chat. 

//Make sure there's at least SOMETHING there. It won't log, but it won't throw
//errors either (I think).
if(!window.LogSystem)
   window.LogSystem = {RootLogger : {log : function(message, level){}}};

var LocalChatDrawLegacyInterface = {
   //Default to kland, should take image data as a blob, or an animation
   //in the default animation format
   ExportBucket : function() { return "newSBSchatDraw"; },
   AllowAnimation : false,
   GenericError : function(message, data)
   {
      alert("ERROR: " + message);
   },
   UploadFunction : function(imageRaw, isAnimation, success, fail)
   {
      var uploadData = new FormData();
      if(isAnimation) uploadData.append("animation", JSON.stringify(animation));
      else uploadData.append("image", imageRaw, "rawimage.png");
      uploadData.append("bucket", LocalChatDrawLegacyInterface.ExportBucket());

      RequestUtilities.XHRSimple("https://kland.smilebasicsource.com/uploadimage",
         function(response)
         {
            if(response.startsWith("http"))
            {
               success(response);
            }
            else
            {
               console.log(response);
               if(fail) fail(response);
            }
         }, uploadData);
   },
   SendFunction : function(link)
   {
      console.log("IGNORING CHATDRAW SEND: " + link);
   },
   GetAnimations : function(callback, element)
   {

   },
   LoadAnimation : function(storeObject)
   {

   }
};

var LocalChatDraw = (function() {

   //The chatdraw canvas's expected width and height
   var chatDrawCanvasWidth = 200;
   var chatDrawCanvasHeight = 100;

   var drawAreaID = "chatdraw";
   var colorButtonClass = "colorChange";
   var colorPickerID = "colorPicker";
   var hideCharacters = 20;
   var maxLineWidth = 7;
   var maxScale = 5;
   var defaultLineWidth = 2;
   var drawer = false;
   var animateFrames = false;
   var animationPlayer = false;
   var drawIframe;
   var firstTimeRecentered = false;

   var saveInput = false;

   var animationTag = "_chdran";

   var copyDrawing = function(string)
   {
      StorageUtilities.WriteLocal(ChatDrawUtilities.ClipboardKey, string);
      UXUtilities.Toast("Copied drawing (chatdraw only!)");
   };

   var getClipboardDrawing = function()
   {
      return StorageUtilities.ReadLocal(ChatDrawUtilities.ClipboardKey);
   };

   var createToolButton = function(displayCharacters, toolNames)
   {
      if(!TypeUtilities.IsArray(displayCharacters)) displayCharacters= [displayCharacters];
      if(!TypeUtilities.IsArray(toolNames)) toolNames = [toolNames];
      var nextTool = 0;
      var tButton = HTMLUtilities.CreateUnsubmittableButton(displayCharacters[nextTool]); 
      tButton.className = "toolButton";
      tButton.addEventListener('click', function()
      {
         //First, deselect ALL other buttons;
         var toolButtons = document.querySelectorAll("#" + drawAreaID + " button.toolButton");
         for(var i = 0; i < toolButtons.length; i++)
         {
            if(toolButtons[i] != tButton) toolButtons[i].removeAttribute("data-selected");
         }

         //Now figure out if we're just selecting this button or cycling
         //through the available tools
         if(tButton.getAttribute("data-selected"))
            nextTool = (nextTool + 1) % toolNames.length;

         tButton.innerHTML = displayCharacters[nextTool];
         tButton.setAttribute("data-selected", "true");
         drawer.currentTool = toolNames[nextTool];
      });
      return tButton;
   };

   var selectNextRadio = function()
   {
      var index = animateFrames.GetSelectedFrameIndex();
      if(index < animateFrames.GetFrameCount() - 1)
         animateFrames.SelectFrameIndex(index + 1);
   };

   var selectPreviousRadio = function()
   {
      var index = animateFrames.GetSelectedFrameIndex();
      if(index > 0) 
         animateFrames.SelectFrameIndex(index - 1);
   };

   var getButtonColorString = function()
   {
      return getColorString(getButtonColors());
   };

   var getColorString = function(colors)
   {
      var colorSet = "";

      for(var i = 0; i < colors.length; i++)
      {
         colorSet += rgbToFillStyle(colors[i]);
         if(i !== colors.length - 1)
            colorSet += "/";
      }

      return colorSet;
   };

   var parseColorString = function(string)
   {
      var colors = string.split("/");
      var result = [];

      for(var i = 0; i < colors.length; i++)
         result.push(fillStyleToRgb(colors[i]));

      return result;
   };

   var setButtonColors = function(palette)
   {
      var buttons = getColorButtons();

      for(var i = 0; i < palette.length; i++)
      {
         if(i < buttons.length)
         {
            buttons[i].style.color = palette[i].ToRGBString();

            if(buttons[i].hasAttribute("data-selected"))
               drawer.color = buttons[i].style.color;
         }
      }

      drawer.moveToolClearColor = rgbToFillStyle(getClearColor());
   };

   var widthToggle = function (widthButton)
   {
      var width = (Number(widthButton.dataset.width) % maxLineWidth) + 1;
      widthButton.innerHTML = String(width);
      widthButton.setAttribute("data-width", String(width));
      drawer.lineWidth = width;
   };

   var getAnimations = function(callback, element)
   {
      var formData = new FormData();
      formData.append("list", "1");
      fullGenericXHR("/query/submit/varstore?session=" + StorageUtilities.GetPHPSession(), 
         formData, element, function(json, statusElement)
         {
            genericSuccess(json, element);

            var result = [];

            for(var i = 0; i < json.result.length; i++)
               if(json.result[i].endsWith(animationTag))
                  result.push(json.result[i].slice(0, -animationTag.length));

            callback(result);
         });
   };

   //Once you have a compliant v2 object, this is the actual load function.
   var loadAnimation = function(storeObject)
   {
      animationPlayer.FromStorageObject(storeObject);
      animateFrames.ClearAllFrames();
      
      for(var i = 0; i < animationPlayer.frames.length; i++)
      {
         animateFrames.InsertNewFrame(i - 1);
         animateFrames.SetFrame(animationPlayer.frames[i], i);
      }

      animateFrames.SelectFrameIndex(0);
   };

   var setupInterface = function(interfaceContainer, skipChatSetup)
   {
      var messagePane = interfaceContainer || document.querySelector("#sendpane");
      var i;

      var drawArea = document.createElement("draw-area");
      var canvasContainer = document.createElement("canvas-container");
      var buttonArea = document.createElement("button-area");
      var buttonArea2 = document.createElement("button-area");
      var toggleButton = HTMLUtilities.CreateUnsubmittableButton(); 
      var sendButton = HTMLUtilities.CreateUnsubmittableButton();
      var widthButton = HTMLUtilities.CreateUnsubmittableButton();
      var cSizeButton = HTMLUtilities.CreateUnsubmittableButton();
      var undoButton = HTMLUtilities.CreateUnsubmittableButton();
      var redoButton = HTMLUtilities.CreateUnsubmittableButton();
      var clearButton = HTMLUtilities.CreateUnsubmittableButton();
      var freehandButton = createToolButton(["✏","✒","⚟"], ["freehand","slow","spray"]);
      var lineButton = createToolButton(["▬","◻"], ["line", "square"]);
      var fillButton = createToolButton(["◘","◼"], ["fill","clear"]);
      var moveButton = createToolButton(["↭"], ["mover"]);
      var canvas = ChatDrawUtilities.CreateCanvas(); 
      var lightbox = ChatDrawUtilities.CreateCanvas();
      var colorPicker = document.createElement("input");
      lightbox.className = "lightbox";

      var frameContainer = document.createElement("animate-frames");
      animateFrames = new AnimatorFrameSet(frameContainer);
      animateFrames.OnFrameSelected = function(data)
      {
         setButtonColors(data.palette);
         drawer.buffers[0].canvas = data.canvas;
         drawer.ClearUndoBuffer();
         drawer.Redraw();

         var lightboxFrames = [];
         var lightboxCount = Number(lightboxButton.innerHTML);
         var selectedIndex = animateFrames.GetSelectedFrameIndex();
         var totalFrames = animateFrames.GetFrameCount();
         var i;

         if(lightboxCount > 0)
         {
            for(i = Math.max(0, selectedIndex - lightboxCount); i < selectedIndex; i++)
               lightboxFrames.push(animateFrames.GetFrame(i));
         }
         else
         {
            for(i = Math.min(totalFrames - 1, selectedIndex - lightboxCount); i > selectedIndex; i--)
               lightboxFrames.push(animateFrames.GetFrame(i));
         }

         var opacities = [0.03, 0.12, 0.25];
         ChatDrawUtilities.CreateLightbox(lightboxFrames, lightbox, opacities.slice(-lightboxFrames.length));
      };

      var firstFrame = animateFrames.InsertNewFrame(0);

      drawer = new CanvasDrawer();
      drawer.Attach(canvas, [firstFrame.canvas], 5);
      drawer.OnUndoStateChange = function() 
      {
         undoButton.disabled = !drawer.CanUndo();
         redoButton.disabled = !drawer.CanRedo();
      };

      //Set up the color picker
      colorPicker.id = colorPickerID;
      colorPicker.setAttribute("type", "color");
      colorPicker.style.width = "0";
      colorPicker.style.height = "0";
      colorPicker.style.padding = "0";
      colorPicker.style.margin = "0";
      colorPicker.style.border = "none";
      colorPicker.style.visibility = "hidden";
      colorPicker.addEventListener("change", function(event)
      {
         var frame = animateFrames.GetFrame();
         var newColor = StyleUtilities.GetColor(event.target.value);
         CanvasUtilities.SwapColor(frame.canvas.getContext("2d"), 
            StyleUtilities.GetColor(event.target.associatedButton.style.color), newColor, 0);
         event.target.associatedButton.style.color = newColor.ToRGBString(); 
         drawer.color = newColor.ToRGBString(); 
         drawer.moveToolClearColor = rgbToFillStyle(getClearColor());
         drawer.Redraw();

         //TODO: Fix this later! Buttons should only be proxies for the real
         //colors stored in each frame! Don't set the palette based on the
         //buttons, set the palette when the user changes the color and ping
         //the palette back to the buttons (maybe with a call to "select" again)
         frame.palette = ChatDrawUtilities.StringToPalette(getButtonColorString());
         animateFrames.SetFrame(frame);
      });

      //Set up the various control buttons (like submit, clear, etc.)
      clearButton.innerHTML = "✖";
      clearButton.addEventListener("click", function()
      {
         if(drawer.StrokeCount()) drawer.UpdateUndoBuffer();
         CanvasUtilities.Clear(animateFrames.GetFrame().canvas, 
         rgbToFillStyle(getClearColor()));
         drawer.Redraw();
      });
      drawArea.id = drawAreaID;
      drawArea.setAttribute("tabindex", "-1");
      drawArea.addEventListener("keydown", function(ev)
      {
         if(drawArea.dataset.hidden) return;
         if(ev.keyCode === 40)
            selectNextRadio();
         if(ev.keyCode === 38)
            selectPreviousRadio();
      });
      widthButton.innerHTML = String(defaultLineWidth - 1);
      widthButton.setAttribute("data-width", String(defaultLineWidth - 1));
      widthButton.addEventListener("click", widthToggle.callBind(widthButton));
      sendButton.innerHTML = "➥";
      sendButton.dataset.button = "sendDrawing";
      sendButton.addEventListener("click", function() 
      {
         animateFrames().GetFrame().canvas.toBlob(blob =>
         {
            LocalChatDrawLegacyInterface.UploadFunction(blob, false,
               l => LocalChatDrawLegacyInterface.SendFunction(l),
               e => LocalChatDrawLegacyInterface.GenericError("Upload failed!", e));
         });
      });
      toggleButton.innerHTML = "✎";
      toggleButton.addEventListener("click", toggleInterface);
      cSizeButton.innerHTML = "◲";
      cSizeButton.addEventListener("click", scaleInterface);
      undoButton.innerHTML = "↶";
      undoButton.addEventListener("click", function() { drawer.Undo(); });
      redoButton.innerHTML = "↷";
      redoButton.addEventListener("click", function() { drawer.Redo(); });
      drawer.DoUndoStateChange();

      //These are the only elements that will be displayed if the drawing area
      //goes hidden. CSS doesn't have to look at these, ofc.
      toggleButton.setAttribute("data-keep", "true");
      buttonArea2.setAttribute("data-keep", "true");

      buttonArea.appendChild(cSizeButton);
      buttonArea.appendChild(undoButton);
      buttonArea.appendChild(redoButton);

      //Create the color picking buttons
      for(i = 0; i < ChatDrawUtilities.BaseColors.length; i++)
      {
         var colorButton = HTMLUtilities.CreateUnsubmittableButton(); //makeUnsubmittableButton();

         colorButton.innerHTML = "■";
         colorButton.className = colorButtonClass;
         colorButton.addEventListener("click", colorButtonSelect.callBind(colorButton, canvas));

         buttonArea.appendChild(colorButton);

         if(i === 1)
            colorButton.click();
      }

      buttonArea.appendChild(sendButton);

      buttonArea2.appendChild(colorPicker);
      buttonArea2.appendChild(moveButton);
      buttonArea2.appendChild(clearButton);
      buttonArea2.appendChild(widthButton);
      buttonArea2.appendChild(fillButton);
      buttonArea2.appendChild(lineButton);
      buttonArea2.appendChild(freehandButton);
      buttonArea2.appendChild(toggleButton);
      canvasContainer.appendChild(canvas);
      canvasContainer.appendChild(lightbox);
      drawArea.appendChild(canvasContainer);
      drawArea.appendChild(buttonArea);
      drawArea.appendChild(buttonArea2);

      //Before we finish entirely, set up the animation area.
      var animateArea = document.createElement("animate-area");
      var animateScroller = document.createElement("animate-scroller");
      var animateControls = document.createElement("button-area");
      var animateSave = document.createElement("button-area");
      var newFrame = HTMLUtilities.CreateUnsubmittableButton("+");
      var frameSkip = document.createElement("input");
      var lightboxButton = HTMLUtilities.CreateUnsubmittableButton("0");
      var repeatAnimation = HTMLUtilities.CreateUnsubmittableButton("→");
      var exportAnimation = HTMLUtilities.CreateUnsubmittableButton("⛟");
      var sendAnimation = HTMLUtilities.CreateUnsubmittableButton("➥");
      var playPause = HTMLUtilities.CreateUnsubmittableButton("►");
      var saveAnimationButton = HTMLUtilities.CreateUnsubmittableButton("📝");
      var loadAnimationButton = HTMLUtilities.CreateUnsubmittableButton("☝");
      var listAnimations = HTMLUtilities.CreateUnsubmittableButton("L");
      saveInput = document.createElement("input");
      saveInput.setAttribute("name", "name");
      saveInput.setAttribute("placeholder", "Animation Name");
      saveAnimationButton.setAttribute("title", "Save animation to server");
      loadAnimationButton.setAttribute("title", "Load animation from server");
      listAnimations.setAttribute("title", "List all animations (in chat)");
      lightboxButton.setAttribute("title", "Lightbox toggle");
      exportAnimation.setAttribute("title", "Export animation to gif");
      playPause.setAttribute("title", "Play / Stop animation");
      repeatAnimation.setAttribute("title", "Toggle animation loop");
      newFrame.setAttribute("title", "Insert new frame after current");
      sendAnimation.setAttribute("title", "Send animation in chat");
      sendAnimation.dataset.button = "sendAnimation";

      frameSkip.setAttribute("type", "number");
      frameSkip.setAttribute("min", "1");
      frameSkip.setAttribute("max", "600");
      frameSkip.setAttribute("placeholder", "1=60fps");
      frameSkip.setAttribute("title", "Frame skip (1=60fps)");
      frameSkip.value = 3;

      lightboxButton.addEventListener("click", function(event)
      {
         var next = Number(lightboxButton.innerHTML) + 1;
         if(next > 3) next = -3;
         lightboxButton.innerHTML = String(next);
         animateFrames.SelectFrameIndex(animateFrames.GetSelectedFrameIndex());
      });

      var saveAnimationWrapper = function(name)
      {
         UXUtilities.Toast("Saving... please wait");
         animationPlayer.frames = animateFrames.GetAllFrames();
         var object = animationPlayer.ToStorageObject();
         writePersistent(name + animationTag, object, function()
         {
            UXUtilities.Toast("Saved animation '" + name + "'");
         });
      };

      var loadAnimationWrapper = function(name)
      {
         readPersistent(name + animationTag, function(value)
         {
            //Perform the version 1 conversion... eugh
            if(!value.version || value.version < 2)
            {
               var loadCount = 0;
               value.times = value.frames;
               value.data = [];
               value.version = 2;

               console.log("Loading an older animation");

               for(var i = 0; i < value.times.length; i++)
               {
                  /* jshint ignore:start */
                  let index = i;
                  readPersistent(name + animationTag + "_" + index, function(drawing)
                  {
                     value.data[index] = drawing;
                     loadCount++;

                     if(loadCount === value.times.length)
                     {
                        loadAnimation(value);
                        UXUtilities.Toast("Loaded animation '" + name + "'");
                     }
                  });
                  /* jshint ignore:end */
               }
            }
            else
            {
               loadAnimation(value);
               UXUtilities.Toast("Loaded animation '" + name + "'");
            }
         });
      };

      saveAnimationButton.addEventListener("click", function(event)
      {
         if(!saveInput.value)
         {
            UXUtilities.Toast("You must give the animation a name!");
            return;
         }

         getAnimations(function(anims)
         {
            if(ArrayUtilities.Contains(anims, saveInput.value))
            {
               UXUtilities.Confirm("There's already an animation named " +
                  saveInput.value + ", are you sure you want to overwrite it?",
               function(confirmed)
               {
                  if(confirmed) saveAnimationWrapper(saveInput.value);
               });
            }
            else
            {
               saveAnimationWrapper(saveInput.value);
            }
         });
      });

      listAnimations.addEventListener("click", function(event)
      {
         getAnimations(function(anims)
         {
            localModuleMessage("Your animations: \n" + anims.join("\n"));
         }, listAnimations);
      });

      loadAnimationButton.addEventListener("click", function(event)
      {
         if(!saveInput.value)
         {
            UXUtilities.Toast("You must give a name to load an animation!");
            return;
         }
         getAnimations(function(anims)
         {
            if(!ArrayUtilities.Contains(anims, saveInput.value))
            {
               UXUtilities.Toast("Couldn't find animation " + saveInput.value);
               return;
            }
            UXUtilities.Confirm("You will lose any unsaved progress. Are you sure you want to load " +
               saveInput.value + "?", function(confirmed)
            {
               if(confirmed) loadAnimationWrapper(saveInput.value);
            });
         });
      });

      newFrame.addEventListener("click", function(event)
      {
         animateFrames.InsertNewFrame(animateFrames.GetSelectedFrameIndex(), true);
      });

      repeatAnimation.addEventListener("click", function(event)
      {
         if(repeatAnimation.hasAttribute("data-repeat"))
         {
            repeatAnimation.removeAttribute("data-repeat");
            repeatAnimation.innerHTML = "→";
         }
         else
         {
            repeatAnimation.setAttribute("data-repeat", "true");
            repeatAnimation.innerHTML = "⟲";
         }
      });

      sendAnimation.addEventListener("click", function(event)
      {
         UXUtilities.Confirm("A copy of your current animation will be created and become publicly available. " +
            "Animation will use the currently selected frame as a title card. " +
            "Are you sure you want to post your animation?", function(confirmed)
            {
               if(!confirmed) return;
               UXUtilities.Toast("Uploading animation... please wait");
               animationPlayer.frames = animateFrames.GetAllFrames();
               var animation = animationPlayer.ToStorageObject();
               var uploadData = new FormData();
               uploadData.append("text", JSON.stringify(animation));
               RequestUtilities.XHRSimple(location.protocol + "//kland.smilebasicsource.com/uploadtext",
                  function(response)
                  {
                     if(response.startsWith("http"))
                     {
                        sendDrawing(response);
                     }
                     else
                     {
                        UXUtilities.Toast("The animation failed to upload! " + response);
                     }
                  }, uploadData);
            });
      });
      
      exportAnimation.addEventListener("click", function()
      {
         UXUtilities.Confirm("Your animation will be captured as-is and turned into a gif. " +
            "Frame timings may be slightly off due to gif timings, particularly lower frame times. " +
            "Are you ready to export your animation?", function(confirmed)
            {
               if(!confirmed) return;
               UXUtilities.Toast("Exporting animation... please wait");
               animationPlayer.frames = animateFrames.GetAllFrames();
               var animation = animationPlayer.ToStorageObject(true);
               var uploadData = new FormData();
               uploadData.append("animation", JSON.stringify(animation));
               uploadData.append("bucket", LocalChatDrawLegacyInterface.ExportBucket());
               RequestUtilities.XHRSimple(location.protocol + "//kland.smilebasicsource.com/uploadimage",
                  function(response)
                  {
                     if(response.startsWith("http"))
                     {
                        window.open(response, "_blank");
                     }
                     else
                     {
                        console.log(response);
                        UXUtilities.Toast("The animation failed to upload! " + response);
                     }
                  }, uploadData);
            });
      });

      animationPlayer = new AnimationPlayer(canvas, false, 
         function(newValue) 
         { 
            if(newValue === undefined)
            {
               return repeatAnimation.hasAttribute("data-repeat"); 
            }
            else
            {
               if(newValue != repeatAnimation.hasAttribute("data-repeat"))
                  repeatAnimation.click();
            }
         },
         function(newValue) 
         { 
            if(newValue === undefined)
               return frameSkip.value; 
            else
               frameSkip.value = newValue;
         });

      animationPlayer.OnPlay = function(player)
      {
         if(!frameSkip.value)
         {
            UXUtilities.Toast("Invalid frametime value");
            return false;
         }

         player.frames = animateFrames.GetAllFrames(); 

         player.disabledAction = drawer.OnAction;
         drawer.OnAction = function() {};
         newFrame.disabled = true;
         buttonArea.disabled = true;
         playPause.innerHTML = "■";
         lightbox.style.display = "none";
      };

      animationPlayer.OnStop = function(player)
      {
         playPause.innerHTML = "►";
         drawer.OnAction = player.disabledAction;
         newFrame.disabled = false;
         buttonArea.disabled = false;
         drawer.Redraw();
         lightbox.style.display = "";
      };

      playPause.addEventListener("click", function(event)
      {
         if(animationPlayer.IsPlaying())
            animationPlayer.Stop();
         else
            animationPlayer.Play(animateFrames.GetSelectedFrameIndex());
      });

      animateControls.appendChild(newFrame);
      animateControls.appendChild(frameSkip);
      animateControls.appendChild(lightboxButton);
      animateControls.appendChild(repeatAnimation);
      animateControls.appendChild(exportAnimation);
      animateControls.appendChild(sendAnimation);
      animateControls.appendChild(playPause);
      animateScroller.appendChild(frameContainer); //animateFrames);
      animateSave.appendChild(saveInput);
      animateSave.appendChild(saveAnimationButton);
      animateSave.appendChild(loadAnimationButton);
      animateSave.appendChild(listAnimations);
      animateArea.appendChild(animateControls);
      animateArea.appendChild(animateScroller);
      animateArea.appendChild(animateSave);

      if(LocalChatDrawLegacyInterface.AllowAnimation) drawArea.appendChild(animateArea);

      messagePane.appendChild(drawArea);

      //Make sure the interface is hidden, since we create it exposed.
      animateFrames.SelectFrameIndex(0);
      widthButton.click();
      freehandButton.click();
      toggleInterface({target : toggleButton});

      drawArea.dataset.scale = 
         String(MathUtilities.MinMax(Math.floor((drawArea.getBoundingClientRect().right - 200) / 200), 1, 3));

      drawer.moveToolClearColor = rgbToFillStyle(getClearColor());

      //Now set up the overall document events.
      if(!skipChatSetup)
         document.querySelector("#sendpane textarea").addEventListener("keyup", onKeyUp);
   };

   var interfaceVisible = function()
   {
      try
      {
         return !document.getElementById(drawAreaID).dataset.hidden;
      }
      catch(ex)
      {
         LogSystem.RootLogger.log("Error while checking interface visibility: " + ex);
      }
   };

   var toggleInterface = function(event, allowResize)
   {
      try
      {
         var container = document.getElementById(drawAreaID);

         if(container.dataset.hidden)
            container.removeAttribute("data-hidden");
         else
            container.setAttribute("data-hidden", "true");

         if(drawIframe && !firstTimeRecentered && (allowResize !== false))
         {
            console.debug("DOING A HIDDEN DISPLAY FORCE SIZE HACK");
            drawIframe.contentWindow.postMessage({recenter:true}, "*");
            drawIframe.contentWindow.postMessage({recenter:true}, "*");
            //because I don't feel like figuring out why it requires two so I
            //just let it happen twice.
            firstTimeRecentered = true;
         }
      }
      catch(ex)
      {
         LogSystem.RootLogger.log("Error while toggling drawing interface: " + ex);
      }
   };

   var dockInterface = function(dock, drawArea)
   {
      try
      {
         drawArea = drawArea || document.getElementById(drawAreaID);
         var positionButton = drawArea.querySelector("button.position");
         if(dock)
         {
            drawArea.setAttribute("data-docked", "true");
            positionButton.innerHTML = "◱";
            writeStorage("chatDrawDocked", true); 
         }
         else
         {
            drawArea.removeAttribute("data-docked");
            positionButton.innerHTML = "◲";
            writeStorage("chatDrawDocked", false);
         }
      }
      catch(ex)
      {
         LogSystem.RootLogger.log("Error while docking drawing interface: " + ex);
      }
   };

   var scaleInterface = function(event)
   {
      try
      {
         var container = document.getElementById(drawAreaID);
         var rect = container.getBoundingClientRect();

         var scale = Number(container.dataset.scale);
         var originalWidth = rect.width / scale;

         //Figure out the NEXT scale.
         if(scale < maxScale && rect.right - originalWidth * (scale + 1) - 200 > 5)
            scale++;
         else
            scale = 1;

         container.dataset.scale = String(scale);
      }
      catch(ex)
      {
         LogSystem.RootLogger.log("Error while scaling drawing interface: " + ex);
      }
   };

   //The function that is called when the given colorButton is selected. The
   //canvas is also given so that colors may be swapped if necessary
   var colorButtonSelect = function(colorButton, canvas)
   {
      var alreadySelected = colorButton.dataset.selected;
      var buttons = getColorButtons();

      //Reset everything
      for(var i = 0; i < buttons.length; i++)
      {
         buttons[i].removeAttribute("data-selected");
      }

      //Set current button to this one.
      colorButton.dataset.selected = "true";

      //If this button was already selected, perform the color swap.
      if(alreadySelected)
      {
         var colorPicker = document.getElementById(colorPickerID);
         colorButton.appendChild(colorPicker);
         colorPicker.associatedButton = colorButton;
         colorPicker.value = rgbToHex(fillStyleToRgb(colorButton.style.color));
         colorPicker.focus();
         colorPicker.click();
      }
      else
      {
         drawer.color = colorButton.style.color;
      }
   };

   //Get the colors from the drawing area buttons
   var getButtonColors = function()
   {
      var colors = [];
      var buttons = getColorButtons();

      for(var i = 0; i < buttons.length; i++)
         colors.push(fillStyleToRgb(buttons[i].style.color));

      return colors;
   };

   //Get the color that is best suited to be a clearing color (the color that
   //is closest to either white or black, whichever comes first)
   var getClearColor = function()
   {
      var colors = getButtonColors();
      var max = 0;
      var clearColor = 0;

      for(var i = 0; i < colors.length; i++)
      {
         var full = Math.pow((colors[i][0] + colors[i][1] + colors[i][2] - (255 * 3 / 2 - 0.1)), 2);

         if(full > max)
         {
            max = full;
            clearColor = i;
         }
      }

      return colors[clearColor];
   };

   //Get the buttons representing the color switching
   var getColorButtons = function()
   {
      return document.querySelectorAll("#" + drawAreaID + " button-area button." + colorButtonClass);
   };

   var onKeyUp = function(event)
   {
      try
      {
         var drawArea = document.getElementById(drawAreaID);
         if(event.target.value.length > hideCharacters)
            drawArea.style.visibility = "hidden";
         else
            drawArea.style.visibility = "visible";
      }
      catch(ex)
      {
         LogSystem.RootLogger.log("Couldn't hide or unhide drawing toggle: " + ex);
      }
   };
   return {
      "getColorButtons" : getColorButtons,
      //"checkMessageForDrawing" : checkMessageForDrawing,
      "setupInterface" : setupInterface,
      "getButtonColors" : getButtonColors,
      "drawingWidth" : chatDrawCanvasWidth,
      "drawingHeight" : chatDrawCanvasHeight,
      "createToolButton" : createToolButton,
      "getDrawer" : function() { return drawer; },
      "getAnimateFrames" : function() { return animateFrames; },
      "getAnimationPlayer" : function() { return animationPlayer; },
      "loadAnimation" : loadAnimation
   };
   
})();

//Convert a 3 channel palette color into a fill style
function rgbToFillStyle(channels)
{
   return "rgb(" + channels[0] + "," + channels[1] + "," + channels[2] + ")";
}

//Convert back from the rgba fill style to an array
function fillStyleToRgb(fillStyle)
{
   var regex = /^\s*rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)\s*$/i;
   var result = regex.exec(fillStyle);
   return result ? [ Number(result[1]), Number(result[2]), Number(result[3]) ] : null;
}

//Convert a hex color into RGB values
function hexToRGB(hex) 
{
   // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
   var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
   hex = hex.replace(shorthandRegex, function(m, r, g, b) 
   {
      return r + r + g + g + b + b;
   });

   var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
   return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
   ] : null;
}

function rgbToHex(channels) 
{
   return "#" + ((1 << 24) + (channels[0] << 16) + (channels[1] << 8) + channels[2]).toString(16).slice(1);
}

function AnimatorFrameSet(container)
{
   this.container = container;

   this.FrameTag = "animate-frame";
   this.FrameControlTag = "frame-controls";
   this.FramePaletteAttribute = "data-palette";
   this.FrameTimeAttribute = "data-time";
   this.SelectedAttribute = "data-selected";

   this.OnFrameSelected = false;

   this.FrameTimeMax = 6000;
   this.FrameTimeMin = 1;
}

AnimatorFrameSet.prototype.FrameSelected = function(frameData)
{
   if(this.OnFrameSelected) this.OnFrameSelected(frameData);
};

AnimatorFrameSet.prototype.ClearAllFrames = function()
{
   this.container.innerHTML = "";
};

AnimatorFrameSet.prototype._GetAllFrameElements = function(selectedOnly)
{
   return this.container.querySelectorAll(":scope > " + this.FrameTag +
      (selectedOnly ? '[' + this.SelectedAttribute + ']' : ""));
};

AnimatorFrameSet.prototype._GetIndexOfFrame = function(frame)
{
   var elements = this._GetAllFrameElements();

   for(var i = 0; i < elements.length; i++)
   {
      if(elements[i].isSameNode(frame))
         return i;
   }

   return -1;
};

AnimatorFrameSet.prototype._IsSelected = function(frame)
{
   return this._GetIndexOfFrame(frame) === this.GetSelectedFrameIndex();
};

AnimatorFrameSet.prototype._GetDataFromFrame = function(frameElement)
{
   var element = frameElement.querySelector('[' + this.FrameTimeAttribute + ']');
   var time = Number(element.value);

   var frame = new AnimatorFrame(
      frameElement.querySelector("canvas"),
      ChatDrawUtilities.StringToPalette(frameElement.getAttribute(this.FramePaletteAttribute)),
      time <= this.FrameTimeMax && time >= this.FrameTimeMin ? time : 0
   );

   frame.timeElement = element;
   return frame;
};

//Fill the given frame element with the given data (for instance, set palette,
//time, etc)
AnimatorFrameSet.prototype._FillFrameWithData = function(frameElement, frameData)
{
   frameElement.setAttribute(this.FramePaletteAttribute, 
      ChatDrawUtilities.PaletteToString(frameData.palette));

   var original = this._GetDataFromFrame(frameElement);

   //Fill canvas IF it's not exactly the same canvas
   if(!original.canvas.isSameNode(frameData.canvas))
      CanvasUtilities.CopyInto(original.canvas.getContext("2d"), frameData.canvas);

   if(frameData.time)
      original.timeElement.value = frameData.time;
   else
      original.timeElement.value = "";
};

AnimatorFrameSet.prototype._SelectFrame = function(frameElement)
{
   //First, get rid of all selected attributes
   var selected = this._GetAllFrameElements(true);
   var i;

   for(i = 0; i < selected.length; i++)
      selected[i].removeAttribute(this.SelectedAttribute);

   frameElement.setAttribute(this.SelectedAttribute, "true");
   this.FrameSelected(this._GetDataFromFrame(frameElement));
};

//Insert a new frame AFTER the given index. If index is negative or there are
//no frames, frame is inserted at beginning.
AnimatorFrameSet.prototype.InsertNewFrame = function(index, selectNow)
{
   var palette;
   var canvas = ChatDrawUtilities.CreateCanvas();
   var me = this;

   try { palette = this.GetFrame().palette; }
   catch (ex) { palette = ChatDrawUtilities.BaseColors; }

   CanvasUtilities.Clear(canvas, ChatDrawUtilities.GetClearColor(palette).ToRGBString());

   var frameData = new AnimatorFrame(canvas, palette, 0);
   
   var frame = document.createElement(this.FrameTag);
   var frameControls = document.createElement(this.FrameControlTag);
   var frameTime = document.createElement("input");
   var frameCopy = HTMLUtilities.CreateUnsubmittableButton("📋");
   var framePaste = HTMLUtilities.CreateUnsubmittableButton("📤");
   var frameDelete = HTMLUtilities.CreateUnsubmittableButton("✖");

   frameTime.setAttribute(this.FrameTimeAttribute, "");
   frameTime.className = "left";
   frameTime.title = "Individual frame time";
   frameCopy.className = "left";
   frameCopy.title = "Copy frame content";
   framePaste.title = "Paste frame content";
   frameDelete.className = "alerthover";
   frameDelete.title = "Delete frame (cannot be undone!)";

   frame.addEventListener("click", function(e)
   {
      me._SelectFrame(frame);
   });

   frameCopy.addEventListener("click", function(event)
   {
      StorageUtilities.WriteLocal(ChatDrawUtilities.ClipboardKey, 
         me._GetDataFromFrame(frame).ToString());
      UXUtilities.Toast("Copied frame to clipboard (chatdraw only!)");
   });

   framePaste.addEventListener("click", function(event)
   {
      var clipboard = StorageUtilities.ReadLocal(ChatDrawUtilities.ClipboardKey);
      var myData = me._GetDataFromFrame(frame);

      if(clipboard)
      {
         var newFrame = ChatDrawUtilities.ChatDrawToFrame(clipboard);
         newFrame.time = myData.time;
         me._FillFrameWithData(frame, newFrame);

         //Reselect frame just in case
         if(me._IsSelected(frame)) me._SelectFrame(frame);
      }
      else
      {
         UXUtilities.Toast("No chatdraw on clipboard");
      }
   });

   frameDelete.addEventListener("click", function(event)
   {
      if(me.GetFrameCount() === 1)
      {
         UXUtilities.Toast("You can't delete the only frame!");
         return;
      }

      UXUtilities.Confirm("Are you sure you want to delete this frame?", function(c)
      {
         if(c)
         {
            var toSelect = frame.nextElementSibling || frame.previousElementSibling;

            //If you're deleting the selected frame, select the "next" frame
            if(me._IsSelected(frame)) 
               me._SelectFrame(toSelect);

            HTMLUtilities.RemoveSelf(frame);
         }
      });
   });

   frameControls.appendChild(frameTime);
   frameControls.appendChild(frameCopy);
   frameControls.appendChild(frameDelete);
   frameControls.appendChild(framePaste);
   frame.appendChild(canvas);
   frame.appendChild(frameControls);

   this._FillFrameWithData(frame, frameData);

   var frames = this._GetAllFrameElements();

   if(index >= frames.length)
      index = frames.length - 1;

   if(frames.length === 0 || index < 0)
      HTMLUtilities.InsertFirst(frame, this.container);
   else
      HTMLUtilities.InsertAfterSelf(frame, frames[index]);

   if(selectNow) this._SelectFrame(frame);

   return frameData;
};

AnimatorFrameSet.prototype.GetFrame = function(index)
{
   if(index === undefined) index = this.GetSelectedFrameIndex();
   var frames = this._GetAllFrameElements();
   return this._GetDataFromFrame(frames[index]);
};

AnimatorFrameSet.prototype.SetFrame = function(frame, index)
{
   if(index === undefined) index = this.GetSelectedFrameIndex();
   var frames = this._GetAllFrameElements();
   this._FillFrameWithData(frames[index], frame);
   if(index === this.GetSelectedFrameIndex())
      this.SelectFrameIndex(index);
};

AnimatorFrameSet.prototype.GetSelectedFrameIndex = function()
{
   var allFrames = this._GetAllFrameElements();

   for(var i = 0; i < allFrames.length; i++)
   {
      if(allFrames[i].hasAttribute(this.SelectedAttribute))
         return i;
   }

   return -1;
};

AnimatorFrameSet.prototype.SelectFrameIndex = function(index)
{
   var allFrames = this._GetAllFrameElements();
   this._SelectFrame(allFrames[index]);
};

AnimatorFrameSet.prototype.GetAllFrames = function()
{
   var allFrames = [];
   var allElements = this._GetAllFrameElements();

   for(var i = 0; i < allElements.length; i++)
      allFrames.push(this._GetDataFromFrame(allElements[i]));

   return allFrames;
};

AnimatorFrameSet.prototype.GetFrameCount = function()
{
   return this._GetAllFrameElements().length;
};

//An animator frame is just a container to hold data
function AnimatorFrame(canvas, palette, time)
{
   this.canvas = canvas;
   this.palette = palette;
   this.time = time;
}

AnimatorFrame.prototype.ToString = function()
{
   return ChatDrawUtilities.FrameToChatDraw(this); 
};

function AnimationPlayer(canvas, frames, repeatFunction, defaultTimeFunction)
{
   var me = this;

   this.canvas = canvas;
   this.frames = frames;

   this._hiddenRepeat = true;
   this._hiddenDefaultTime = 3;

   this.GetRepeat = repeatFunction || function(value) 
   { 
      if(value === undefined) 
         return me._hiddenRepeat; 
      else
         me._hiddenRepeat = value;      
   };
   this.GetDefaultTime = defaultTimeFunction || function(value) 
   { 
      if(value === undefined)
         return me._hiddenDefaultTime; 
      else
         me._hiddenDefaultTime = value;
   };

   this._playing = false;
   this._frameCount = 0;
   this._currentFrame = 0;

   this.OnPlay = false;
   this.OnStop = false;
}

AnimationPlayer.prototype.IsPlaying = function()
{
   return this._playing;
};

AnimationPlayer.prototype._Animate = function()
{
   if(this._playing)
   {
      var skip = this.frames[this._currentFrame - 1] && this.frames[this._currentFrame - 1].time ? 
         this.frames[this._currentFrame - 1].time : this.GetDefaultTime(); 

      if((this._frameCount % skip) === 0)
      {
         this._frameCount = 0;

         if(this._currentFrame >= this.frames.length && this.GetRepeat())
            this._currentFrame = 0;

         if(this._currentFrame >= this.frames.length)
         {
            this.Stop();
            return;
         }

         CanvasUtilities.CopyInto(this.canvas.getContext("2d"), this.frames[this._currentFrame].canvas);
         this._currentFrame++;
      }

      this._frameCount++;

      window.requestAnimationFrame(this._Animate.bind(this));
   }
};

AnimationPlayer.prototype.Play = function(startFrame)
{
   if(this.OnPlay) 
   {
      if(this.OnPlay(this) === false)
      {
         console.debug("Play was cancelled by OnPlay");
         return;
      }
   }

   this._playing = true;
   this._frameCount = 0;
   this._currentFrame = 0;
   if(startFrame !== undefined) this._currentFrame = startFrame;

   this._Animate();
};

AnimationPlayer.prototype.Stop = function()
{
   this._playing = false;
   if(this.OnStop) this.OnStop(this);
};

AnimationPlayer.prototype.FromStorageObject = function(storeObject)
{
   if(storeObject.version !== 2)
   {
      throw "Storage object must be converted to the latest version!";
   }

   this.frames = [];

   for(var i = 0; i < storeObject.data.length; i++)
   {
      this.frames[i] = ChatDrawUtilities.ChatDrawToFrame(storeObject.data[i]);
      this.frames[i].time = storeObject.times[i];
   }

   this.GetRepeat(storeObject.repeat);
   this.GetDefaultTime(storeObject.defaultFrames);
};

AnimationPlayer.prototype.ToStorageObject = function(pngs)
{
   var baseData = { 
      version : 2,
      defaultFrames: this.GetDefaultTime(), 
      repeat : this.GetRepeat(),
      times : [],
      data : []
   };

   for(var i = 0; i < this.frames.length; i++)
   {
      if(this.frames[i].time)
         baseData.times.push(this.frames[i].time); 
      else
         baseData.times.push(0);

      if(pngs)
         baseData.data.push(this.frames[i].canvas.toDataURL("image/png")); 
      else
         baseData.data.push(this.frames[i].ToString());
   }

   return baseData;
};

var ChatDrawUtilities = 
{
   DefaultWidth : 200,
   DefaultHeight : 100,
   ClipboardKey : "chatdrawClipboard",
   BaseColors : [
      new Color(255,255,255),
      new Color(0, 0, 0),
      new Color(255, 0, 0),
      new Color(0, 0, 255)
   ],
   LegacyColors : [
      new Color(255,255,255),
      new Color(0, 0, 0),
      new Color(255, 0, 0),
      new Color(0, 0, 255)
   ],

   PaletteToString : function(palette)
   {
      var colorSet = "";

      for(var i = 0; i < palette.length; i++)
      {
         colorSet += palette[i].ToRGBString(); 
         if(i !== palette.length - 1) colorSet += "/";
      }

      return colorSet;
   },
   StringToPalette : function(string)
   {
      var colors = string.split("/");
      var result = [];

      for(var i = 0; i < colors.length; i++)
         result.push(StyleUtilities.GetColor(colors[i]));

      return result;
   },

   GetClearColor : function(palette)
   {
      var max = 0;
      var clearColor = 0;

      for(var i = 0; i < palette.length; i++)
      {
         var full = Math.pow((palette[i].r + palette[i].g + palette[i].b - (255 * 3 / 2 - 0.1)), 2);

         if(full > max)
         {
            max = full;
            clearColor = i;
         }
      }

      return palette[clearColor];
   },

   CreateCanvas : function()
   {
      var canvas = document.createElement("canvas");
      canvas.width = ChatDrawUtilities.DefaultWidth;
      canvas.height = ChatDrawUtilities.DefaultHeight;
      canvas.getContext("2d").imageSmoothingEnabled = false;
      return canvas;
   },

   //First canvas is bottom
   CreateLightbox : function(frames, destination, opacities)//minAlpha, maxAlpha, maxLightbox)
   {
      CanvasUtilities.Clear(destination);

      var context = destination.getContext("2d");

      for(var i = 0; i < frames.length; i++)
      {
         //This might be expensive! Make sure the browser doesn't slow down
         //from all these created canvases!
         var copy = CanvasUtilities.CreateCopy(frames[i].canvas, frames[i].canvas);
         var clearColor = ChatDrawUtilities.GetClearColor(frames[i].palette);
         CanvasUtilities.SwapColor(copy.getContext("2d"), clearColor, 
            new Color(clearColor.r, clearColor.g, clearColor.b, 0), 0);
         //context.globalAlpha = MathUtilities.Lerp(minAlpha, maxAlpha, (i + 1) / frames.length); 
         context.globalAlpha = opacities[i];
         context.drawImage(copy,0,0);
      }
   },

   FrameToChatDraw : function (frame)
   {
      var time = performance.now();

      var canvas = frame.canvas;
      var palette = frame.palette;

      //Get that 2d context yo. Oh and also, the pixel data and whatever.
      var context = canvas.getContext("2d");
      var imageData = context.getImageData(0,0,canvas.width,canvas.height);
      var pixelData = imageData.data;
      var bitsPerPixel = Math.ceil(Math.log2(palette.length));
      var pixelsPerByte = Math.floor(8 / bitsPerPixel);
      var currentPalette = 0;
      var currentByte = 0;
      var baseData = "";
      var i = 0, j = 0, k = 0;

      var paletteArray = [];

      for(i = 0; i < palette.length; i++)
         paletteArray.push(palette[i].ToArray());

      //Go by 4 because RGBA. Data is encoded in row-major order.
      for(i = 0; i < pixelData.length; i+=4)
      {
         //Shift is how much to shift the current palette value. All this math
         //and we still can't add up T_T
         shift = ((i / 4) % pixelsPerByte) * bitsPerPixel;

         //Merge character into base data string.
         if (i !== 0 && shift === 0)
         {
            baseData += String.fromCharCode(currentByte);
            currentByte = 0;
         }

         //This is the palette representation of the current pixel.
         currentPalette = 0;

         //Check pixel color against palette colors to get palette value.
         for (j = 0; j < paletteArray.length; j++)
         {
            if(paletteArray[j][0] === pixelData[i] &&
               paletteArray[j][1] === pixelData[i + 1] &&
               paletteArray[j][2] === pixelData[i + 2])
            {
               currentPalette = j;
               break;
            }
         }

         //Add palette to current byte.
         currentByte += currentPalette << shift;
      }

      //ALWAYS add the last byte because no matter what, there WILL be extra
      //data leftover, since the current byte is added at the start of the loop
      baseData += String.fromCharCode(currentByte);

      //OY! Before you go, add all the palette data. Yeah that's right, we
      //encode the full RGB color space in the palette data. So what?
      for(i = 0; i < paletteArray.length; i++)
         for(j = 0; j < 3; j++) //DO NOT INCLUDE THE ALPHA CHANNEL!
            baseData += String.fromCharCode(paletteArray[i][j]);

      baseData += String.fromCharCode(paletteArray.length);

      var encodedString = LZString.compressToBase64(baseData);

      return encodedString;
   },

   ChatDrawToFrame : function(string)
   {
      //Legacy images need their original palette. The new images will have the
      //palette encoded within them.
      var width = ChatDrawUtilities.DefaultWidth;
      var height = ChatDrawUtilities.DefaultHeight;
      var palette = ChatDrawUtilities.LegacyColors; 
      var realData = LZString.decompressFromBase64(string);
      var i, j, k;

      //Fix up the palette data based on legacy support. If legacy is detected
      //(ie we have less than or equal to the minimum amount of bytes necessary) 
      //then use default palette. Otherwise, the number of bytes afterwards 
      //determines how the data is encoded.
      if(realData.length > Math.ceil((width * height)/ 4))
      {
         //The very last byte tells us how many palette colors there are. 
         var paletteCount = realData.charCodeAt(realData.length - 1);

         palette = [];

         //Now read all the "apparent" palette bytes.
         for(i = 0; i < paletteCount; i++)
         {
            var color = [];

            //build color from 3 channels
            for(j = 0; j < 3; j++)
               color.push(realData.charCodeAt(realData.length - 1 - (paletteCount - i) * 3 + j));   

            palette.push(new Color(color[0], color[1], color[2]));
         }
      }

      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      var context = canvas.getContext("2d");

      var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      var pixelData = imageData.data;
      var totalPixels = Math.floor(pixelData.length / 4);

      var currentByte;
      var currentPalette;
      var currentPixel = 0;
      var bitsPerPixel = Math.ceil(Math.log2(palette.length));
      var pixelsPerByte = Math.floor(8 / bitsPerPixel);

      byte_loop: //loop over all the bytes.
      for (i = 0; i < realData.length; i++)
      {
         currentByte = realData.charCodeAt(i);

         //Loop over the pixels within the bytes! Usually 4 for legacy
         for (j = 0; j < pixelsPerByte; j++)
         {
            //AND out the bits that we actually want.
            currentPalette = currentByte & ((1 << bitsPerPixel) - 1); 

            //That times 4 is because pixels are 4 bytes and whatever.
            pixelData[currentPixel * 4] =     palette[currentPalette].r; //[0];
            pixelData[currentPixel * 4 + 1] = palette[currentPalette].g; //[1];
            pixelData[currentPixel * 4 + 2] = palette[currentPalette].b; //[2];
            pixelData[currentPixel * 4 + 3] = 255;

            //Shift over to get the next set of bits.
            currentByte = currentByte >> bitsPerPixel;   
            currentPixel++;

            //Stop entire execution when we reach the end of the pixels.
            if(currentPixel >= totalPixels)
               break byte_loop;
         }
      }

      // Draw the ImageData at the given (x,y) coordinates.
      context.putImageData(imageData, 0, 0);
      return new AnimatorFrame(canvas, palette, 0);
   }
};



