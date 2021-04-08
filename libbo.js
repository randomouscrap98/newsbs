//Carlos Sanchez
//2-22-2020
//A NEW collection of... something. I gotta stop making libraries.

// ----- Logging -----

function Logger(consoleLog, maxMessages, maxBuffer)
{
   this.messages = [];
   this.consoleLog = consoleLog || true;
   this.maxMessages = maxMessages || 5000; 
   this.maxBuffer = maxBuffer || 500;
   this.lastId = 0;
}

Logger.prototype.RawLog = function(message, level)
{
   if(this.consoleLog) 
      console.log("[" + level + "] " + message);

   var messageObject = { message: message, level: level, rawTime: new Date(),
      id : ++this.lastId };

   messageObject.time = messageObject.rawTime.toLocaleTimeString();
   this.messages.push(messageObject);

   if(this.messages.length > this.maxMessages)
      this.messages = this.messages.slice(-(this.maxMessages - this.maxBuffer));
};

Logger.prototype.Trace = function(message) { this.RawLog(message, "trace"); };
Logger.prototype.Debug = function(message) { this.RawLog(message, "debug"); };
Logger.prototype.Info = function(message) { this.RawLog(message, "info"); };
Logger.prototype.Warn = function(message) { this.RawLog(message, "warn"); };
Logger.prototype.Error = function(message) { this.RawLog(message, "error"); };

//The singleton logger if you want it
var log = new Logger();


// ----- SPA (Single Page Application) -----

function SpaProcessor(check, process) 
{ 
   this.Check = check;
   this.Process = process;
}

//Basic: a function checks a url. If it processed it, it returns true.
function BasicSpa(logger)
{
   //Capitals are accessible from other places
   this.logger = logger;
   this.Processors = [];
   this.requestId = 0;
}

BasicSpa.prototype.ProcessLink = function(url)
{
   let rid = ++this.requestId;
   this.logger.Debug("Processing link [" + rid + "] " + url);

   for(var i = 0; i < this.Processors.length; i++)
   {
      if(this.Processors[i].Check(url, rid))
      {
         try
         {
            //If the function SPECIFICALLY returned false (it's ok if they
            //return nothing) then they didn't actually decide to process us
            if(this.Processors[i].Process(url, rid) === false)
               continue;
         }
         catch(ex)
         {
            this.logger.Error("Could not process link [" + rid + "] " + url + ": " + ex);
         }
         return true;
      }
   }

   this.logger.Warn("Nothing processed link [" + rid + "] " + url);
   return false;
};

BasicSpa.prototype.SpaContextLink = function(url)
{
   var hash = url.indexOf("#");
   if(hash >= 0)
      return url.substr(0, hash);
   return url;
};

BasicSpa.prototype.ProcessLinkContextAware = function(url)
{
   if(this.SpaContextLink(url) !== this.SpaContextLink(document.location.href))
      if(this.ProcessLink(url))
         history.pushState({"url" : url}, url, url);
};

//Generate the click function for the given URL
BasicSpa.prototype.ClickFunction = function(url)
{
   var me = this;
   return function(event)
   {
      event.preventDefault();
   };
};

//Set this object (us) to handle the window pop state (back/forward) 
BasicSpa.prototype.SetHandlePopState = function()
{
   var me = this;
   window.onpopstate = function(event)
   {
      me.logger.Debug("User browser navigated back/forward to " + document.location.href);
      me.ProcessLink(document.location.href);
   };
};

// ----- Signalling (that one paradigm ugh) -----

var Signaller = function()
{
   this.signals = {};
   this.handlers = {};
   this.autoexceptions = [];
   this.sid = 0;
}

Signaller.prototype.AddAutoException = function(name)
{
   this.autoexceptions.push(name);
};

Signaller.prototype.Add = function(name, data, time)
{
   //console.log("Adding signal "+name);
   let signalId = ++this.sid;

   if(!name)
      throw "Must provide name for signal!";

   if(!this.signals[name])
      this.signals[name] = [];

   this.signals[name].push({
      sid : signalId,
      created : performance.now(),
      data : data,
      time : time || 0
   });
};

Signaller.prototype.Attach = function(name, func)
{
   if(!this.handlers[name])
      this.handlers[name] = [];

   if(func)
      this.handlers[name].push(func);
};

Signaller.prototype.ProcessAuto = function(now)
{
   for(key in this.signals)
   {
      if(this.autoexceptions.indexOf(key) < 0)
         this.Process(key, now);
   }
};

Signaller.prototype.Process = function(name, now)
{
   if(this.signals[name] && this.signals[name].length)
   {
      //console.log("Processing " + name);
      var now = now || performance.now();
      this.signals[name].sort((a,b) => Math.sign(a.time - b.time) ||
         Math.sign(a.sid - b.sid));
      var i;

      for(i = 0; i < this.signals[name].length; i++)
      {
         if(this.signals[name][i].time > now)
            break;

         if(this.handlers[name])
         {
            this.handlers[name].forEach(x => 
               x(this.signals[name][i].data, this.signals[name][i]));
         }
      }

      this.signals[name].splice(0, i);
   }
};

Signaller.prototype.ClearOlderThan = function(time)
{
   for(key in this.signals)
   {
      this.signals[key].sort((a,b) => Math.sign(a.created - b.created));
      var firstOK = this.signals[key].findIndex(x => x.created >= time);
      this.signals[key].splice(0, (firstOK < 0) ? this.signals[key].length : firstOK);
   }
};

var signals = new Signaller();

// ----- Utilities (various functions) -----

var Utilities = 
{
   WindowWidth : function() { 
      return window.innerWidth || document.documentElement.clientWidth || 
         document.body.clientWidth || 0; },
   WindowHeight : function(){ 
      return window.innerHeight || document.documentElement.clientHeight || 
         document.body.clientHeight || 0; },
   ConvertRem : function(x){ 
      return x / parseFloat(getComputedStyle(document.body)["font-size"]); },
   //Taken from https://stackoverflow.com/a/50127768/1066474
   SortElements : function(parent, sortFunc, descending){
      descending = descending ? -1 : 1;
      var sorted = [...parent.children].sort((a,b)=>descending*((sortFunc(a)>sortFunc(b))?1:-1));
      //For most things, this is more efficient in terms of dom manip
      for(var i = 0; i < parent.children.length; i++)
      {
         if(parent.children[i] !== sorted[i])
            parent.insertBefore(sorted[i], parent.children[i]);
      }
   },
   RemoveElement : function(element) {
      var p = element.parentNode;
      p.removeChild(element);
      return p;
   },
   SubHours : function(hours, date) {
      return new Date((date || new Date()).getTime() - (hours * 60 * 60 * 1000));
   },
   ReSource : function(parent, srcAttr, modify) {
      var srcs = parent.querySelectorAll("[" + srcAttr + "]");
      modify = modify || function(s) { return s; };
      for(var i = 0; i < srcs.length; i++)
         srcs[i].src = modify(srcs[i].getAttribute(srcAttr));
   },
   TimeDiff : function(date1, date2, short, nowBuf, decimals) {
      decimals = decimals || 0;
      nowBuf = nowBuf || 5;
      date2 = date2 || new Date(); //Now
      if(typeof date1 === "string")
         date1 = new Date(date1.trim());
      if(typeof date2 === "string")
         date2 = new Date(date2.trim());
      var diff = Math.abs(date1.getTime() - date2.getTime()) / 1000;
      var t = 0, u = "";

      if(diff <= nowBuf) { return short ? "Now" : "Just now"; }
      else if(diff < 60) { t = diff; u = "second"; }
      else if(diff < 3600) { t = diff / 60; u = "minute"; }
      else if(diff < 86400) { t = diff / 3600; u = "hour"; }
      else { t = diff / 86400; u = "day"; }

      var trans = Math.pow(10, decimals);
      t = Math.floor(t * trans) / trans;

      if(short)
         return t + u.substr(0, 1);
      else
         return t + " " + u + (t != 1 ? "s" : "");
   },
   GetParams : function(url)
   {
      return new URLSearchParams((url.split("?")[1] || "").split("#")[0]);
   },
   FindParent : function(element, pfind, maxDepth)
   {
      if(maxDepth === undefined)
         maxDepth = 100;
      if(maxDepth < 0)
         return null;

      if(pfind(element))
         return element;
      else if (!element)
         return null;
      else
         return Utilities.FindParent(element.parentNode, pfind, maxDepth - 1);
   },
   InsertAfter : function(newelm, afterthis)
   {
      //https://stackoverflow.com/a/4793630/1066474
      afterthis.parentNode.insertBefore(newelm, afterthis.nextSibling);
   },
   ShallowEqual : function (object1, object2) 
   {
      const keys1 = Object.keys(object1);
      const keys2 = Object.keys(object2);

      if (keys1.length !== keys2.length)
         return false;

      for (let key of keys1)
         if (object1[key] !== object2[key])
            return false;

      return true;
   },
   ShallowCopy : function(value)
   {
      return JSON.parse(JSON.stringify(value));
   },
   MergeInto : function (base, newthing) 
   {
      var keys = Object.keys(newthing);

      for (let key of keys)
         base[key] = newthing[key];

      return base;
   },
   ParseYoutube :	function (url) 
   {
      var result = { id : null };
		var match = url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/);
      if(match)
      {
         result.id = match[1]
         var start = url.match(/[&?](?:t|start)=(\w+)/);
         var end = url.match(/[&?](?:end)=(\w+)/);
         if(start) result.start = start[1];
         if(end) result.end = end[1];
         result.loop = url.match(/[&?]loop(=|&|$)/);
      }
		return result; 
	},
   SetSelected : function(select, value)
   {
      var options = select.querySelectorAll("option");

      for(var i = 0; i < options.length; i++)
         if(options[i].value === value)
            select.selectedIndex = i;
   },
   ScrollToBottom : function(element)
   {
      //Firefox literally doesn't accept numbesr that are TOO big
      element.scrollTop = 9999999; //Number.MAX_SAFE_INTEGER;
   },
   ToggleAttribute : function(element, attribute, toggle)
   {
      if(toggle)
         element.setAttribute(attribute, "");
      else
         element.removeAttribute(attribute, "");
   },
   //https://stackoverflow.com/a/11077016/1066474
   InsertAtCursor : function (myField, myValue) 
   {
      //IE support
      if (document.selection) {
         myField.focus();
         sel = document.selection.createRange();
         sel.text = myValue;
      }
      //MOZILLA and others
      else if (myField.selectionStart || myField.selectionStart == '0') {
         var startPos = myField.selectionStart;
         var endPos = myField.selectionEnd;
         myField.value = myField.value.substring(0, startPos)
         + myValue
         + myField.value.substring(endPos, myField.value.length);
      } else {
         myField.value += myValue;
      }
   },
   //https://medium.com/@fsufitch/is-javascript-array-sort-stable-46b90822543f
   StableSort : function(array, cmp) {
      cmp = !!cmp ? cmp : (a, b) => {
         if (a < b) return -1;
         if (a > b) return 1;
         return 0;
      };
      let stabilizedThis = array.map((el, index) => [el, index]);
      let stableCmp = (a, b) => {
         let order = cmp(a[0], b[0]);
         if (order != 0) return order;
         return a[1] - b[1];
      }
      stabilizedThis.sort(stableCmp);
      for (let i=0; i<array.length; i++) {
         array[i] = stabilizedThis[i][0];
      }
      return array;
   }
};

//Taken from 12 mostly without modification: https://github.com/12Me21/sbs2
var StolenUtils = 
{
   AttachResize: function(element, tab, horiz, dir, save) 
   {
      var startX,startY,held,startW,startH,size = null
      function getPos(e) {
         if (e.touches)
            return {x:e.touches[0].pageX, y:e.touches[0].pageY}
         else
            return {x:e.clientX, y:e.clientY}
      }
      function down(e) {
         tab.setAttribute('dragging',"")
         var pos = getPos(e)
         startX = pos.x
         startY = pos.y
         startW = element.offsetWidth
         startH = element.offsetHeight
         held = true
      }
      function up() {
         held = false
         tab.removeAttribute('dragging')
         if (save && size != null)
            localStorage.setItem(save, JSON.stringify(size))
      }
      function move(e) {
         if (!held)
            return
         var pos = getPos(e)
         if (horiz) {
            var vx = (pos.x - startX) * dir
            size = Math.max(0, startW+vx)
            element.style.width = size+"px"
         } else {
            var vy = (pos.y - startY) * dir
            size = Math.max(0, startH+vy)
            element.style.height = size+"px"
         }
      }	
      tab.addEventListener('mousedown', down)
      document.addEventListener('mouseup', up)
      document.addEventListener('mousemove', move)
      
      tab.addEventListener('touchstart', function(e) {
         e.preventDefault()
         down(e)
      }) //todo: prevent scrolling on mobile
      document.addEventListener('touchend', up)
      document.addEventListener('touchmove', move)
      if (save) {
         size = JSON.parse(localStorage.getItem(save))
         if (size) {
            size = Math.max(0, +size)
            if (horiz)
               element.style.width = size+"px"
            else
               element.style.height = size+"px"
         }
      }
   }//,
   //ChangeFavicon: function(src) 
   //{
   //   if (!faviconElement) 
   //   {
   //      if (src == false)
   //         return
   //      document.head.querySelectorAll("link[data-favicon]").forEach(function(e) {
   //         e.remove()
   //      })
   //      faviconElement = document.createElement('link')
   //      faviconElement.rel = "icon"
   //      document.head.appendChild(faviconElement)
   //   } else if (faviconElement.href == src)
   //      return
   //   if (src == false)
   //      src = "resource/icon16.png"
   //   faviconElement.href = src
   //}
};


//Template loader doesn't care whether it's from html or generated from
//javascript, it just needs you to produce an object with getter/setters for
//things. A template is just a fancy object.

//Hmm... perhaps make generic template loader so it can be swapped out, but
//implement it with the index for main website. This way people can easily
//swap out the templates with their own. Make sure there's a preload function
//on every template so users can keep all the functionality but only alter the
//html. Hmmmmm
function Template(name, element, fields)
{
   this.name = name;
   this.element = element;
   this.fields = fields; //Use getter/setters: Object.defineProperty(obj, "name", get: , set: });
   this.innerTemplates = {};

   this.functions = {}; //Need to keep track of which functions were added to us for hoisting
   this.functionPool = {};
}

//This has a UIkit optimization: it will NOT set fields that are already the
//same. This has quite a high overhead for standard internal fields, but
//external fields can cause a MASSIVE mutationobserver event for any set, so
//it's better to spend a tiny amount of time avoiding that.
Template.prototype.SetFields = function(fields, forceChanges, ignoreInvalid)
{
   var me = this;
   Object.keys(fields).forEach(x => 
   {
      if(!(x in me.fields))
      {
         if(ignoreInvalid)
            return;
         else
            throw "Tried to set invalid template field: " + x;
      }
      var f = fields[x]; //This might be compute intensive? So don't do it twice
      if(forceChanges || (me.fields[x] != f))
         me.fields[x] = f;
   });
};

var StdTemplating = Object.create(null); with (StdTemplating) (function($) { Object.assign(StdTemplating, 
{   
   //Ensure only a single field is ever defined for an object
   SingleField: function(obj, key, define)
   {
      if(key in obj)
         throw "Duplicate field: " + key;
      define.enumerable = true;
      define.configurable = true;
      Object.defineProperty(obj, key, define);
      return obj;
   },
   SingleFieldValue : function(obj, key, value)
   {
      return SingleField(obj, key, { value: value, writable: true });
   },
   //Read the field then remove it immediately afterwards.
   StripField : function(element, field, onlyExists)
   {
      var value = onlyExists ? element.hasAttribute(field) : element.getAttribute(field);
      element.removeAttribute(field);
      return value;
   },
   //Try to perform replacement on currentelement (if it's a template link,
   //otherwise do nothing)
   TryReplace : function(currentelement, tobj)
   {
      if(!currentelement) return

      var link = StripField(currentelement, "tlink");
      var data = StripField(currentelement, "tdata");
      var hoist = StripField(currentelement, "thoist", true);
      var name = StripField(currentelement, "tname") || link;

      //Perform the standard stuff for this element
      if(link)
      {
         //Need to perform standard initialization. Store the template as an inner
         var innertobj = Load(link, tobj.functionPool);
         SingleFieldValue(tobj.innerTemplates, name, innertobj);
         [...currentelement.attributes].forEach(y => innertobj.element.setAttribute(y.name, y.value));

         //Replace ourselves with this.
         currentelement.parentNode.replaceChild(innertobj.element, currentelement);

         if(data)
            innertobj.SetFields(JSON.parse(data));

         //Oh but if we're hoisting, pull all attributes out and place in
         //ourselves, otherwise put them in an aptly named thing
         if(hoist)
         {
            Object.keys(innertobj.fields).forEach(x =>
            {
               SingleField(tobj.fields, x, Object.getOwnPropertyDescriptor(innertobj.fields, x));
            });
            Object.keys(innertobj.functions).forEach(x =>
            {
               SingleFieldValue(tobj.functions, x, innertobj.functions[x]);
            });
         }
         else
         {
            SingleFieldValue(tobj.fields, name, innertobj.fields);
         }
      }

      return link;
   },
   _CheckFunctionPool : function(func, tobj)
   {
      if(!(func in tobj.functionPool))
         throw "No function " + func + " in function pool for template: " + tobj.name;
   },
   ProcessField: function(currentelement, fieldname, tobj)
   {
      //Check for function first, do some special processing
      if(fieldname == "tfunc") //fieldname.startsWith("tfunc-"))
      {
         //var func = fieldname.substr(6);
         var parts = StripField(currentelement, fieldname).split("/");
         var func = parts[0];
         var poolfunc = parts[1] || func;

         _CheckFunctionPool(poolfunc, tobj);

         //Define a function on the tobj itself (if possible, it can't collide)
         //which calls a function within the function pool but WITH the template
         var f = (...args) =>
         {
            args.push(tobj);
            args.push(currentelement);
            return tobj.functionPool[poolfunc].call(tobj.functionPool[poolfunc], ...args);
         };

         SingleFieldValue(tobj, func, f);
         SingleFieldValue(tobj.functions, func, f);
      }
      else if(fieldname.startsWith("t-"))
      {
         var name = fieldname.substr(2);
         var value = StripField(currentelement, fieldname);

         //NOTHING that uses the t system uses pipe, so...
         var nowstart = value.indexOf("|");
         var nowdat = false;

         if(nowstart >= 0)
         {
            //Note: "pipe" is used to pass data to the field IN the template.
            nowdat = value.substr(nowstart + 1);
            value = value.slice(0, nowstart);
         }

         //Now the standard old neat things. Except... uhhh wait, how do you
         //define a function just for this template? oh no...
         if(value.startsWith("."))
         {
            var property = value.substr(1);
            var funcparen = property.indexOf("(");

            if(funcparen >= 0)
            {
               var args = property.substr(funcparen + 1).slice(0,-1).split(",").map(x => x.trim()) || [];
               var func = property.substr(0, funcparen);
               var gfunc = func + "_get";
               var sfunc = func + "_set";

               _CheckFunctionPool(gfunc, tobj);
               _CheckFunctionPool(sfunc, tobj);

               SingleField(tobj.fields, name, {
                  get: () => tobj.functionPool[gfunc](currentelement, tobj, name, args),
                  set: (v) => tobj.functionPool[sfunc](v, currentelement, tobj, name, args)
               });
            }
            else
            {
               if(!(property in currentelement))
                  throw "No property " + property + " in template: " + tobj.name;

               SingleField(tobj.fields, name, {
                  get: () => currentelement[property], 
                  set: (v) => currentelement[property] = v 
               });
            }
         }
         else
         {
            value = value || "data-" + name;

            //It's the field!
            SingleField(tobj.fields, name, {
               get : () => currentelement.getAttribute(value),
               set : (v) => currentelement.setAttribute(value, v)
            });
         }

         if(nowdat || nowdat === "")
            tobj.fields[name] = nowdat;
      }
   },
   //Standard initialization for my index templates, which recurses through
   //elemets to find t-variables 
   Scan: function(currentelement, tobj)
   {
      if(!currentelement)
         return;

      //Stop scanning if it was replaced, there's nothing left to do, DON'T
      //recurse through the newly replaced template (it alerady WAS)
      if(TryReplace(currentelement, tobj))
         return;

      //Look for attributes and create standard redirects based on field value
      [...currentelement.attributes].forEach(x => 
      {
         ProcessField(currentelement, x.name, tobj);
      });

      //Call self for every child (recursive)
      [...currentelement.children].forEach(x => Scan(x, tobj));
   },
   //Get the template from the index, initializing all the inner crap etc. All
   //my templates should be this, you can add other templates ofc.
   Load : function(template, functionPool)
   {
      var base = document.getElementById("templates").content.getElementById(template);
      if(!base) throw "No template found with name: " + template;
      var element = base.cloneNode(true);
      var tobj = new Template(template, element, {});
      element.template = tobj; //make sure you can get back to the template from just the element
      tobj.functionPool = functionPool;
      element.setAttribute("data-template", template);
      element.removeAttribute("id");
      Scan(element, tobj);
      return tobj;
   }
})
//Private vars can go here
}(window));

