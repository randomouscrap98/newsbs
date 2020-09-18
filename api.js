
// *************
// ---- API ----
// *************

function Api(root, signalHandler)
{
   this.root = root;
   this.signal = signalHandler || ((n,d) => console.log("Ignoring signal " + name));
   this.nextrequestid = 0;
   this.getToken = (() => null);
}

Api.prototype.FormatData = function(data)
{
   var base = "[" + data.rid + "] " + data.endpoint + ": " + 
      data.request.status + " " + data.request.statusText;
   return base;
};

Api.prototype.Generic = function(suburl, success, error, always, method, data, modify)
{
   var me = this;

   let thisreqid = ++me.nextrequestid;
   var endpoint = suburl;
   var epquery = endpoint.indexOf("?");

   if(epquery >= 0) 
      endpoint = endpoint.substr(0, epquery);

   url = me.root + "/" + suburl;
   method = method || "GET";

   var req = new XMLHttpRequest();

   var apidat = { rid: thisreqid, url: url, endpoint: endpoint, method : method, request : req,
      senddata : data };

   //This is supposedly thrown before the others
   req.addEventListener("error", function() 
   {
      apidat.networkError = true; 
      me.signal("apinetworkerror", apidat);
   });
   req.addEventListener("loadend", function()
   {
      if(always) 
         always(apidat);

      if(req.status <= 299 && req.status >= 200)
      {
         apidat.data = req.responseText ? JSON.parse(req.responseText) : null;

         if(success)
            success(apidat);

         me.signal("apisuccess", apidat);
      }
      else
      {
         //Also thrown on network error
         if(error)
            error(apidat);

         me.signal("apierror", apidat);
      }

      me.signal("apiend", apidat);
   });

   req.open(method, url);
   req.setRequestHeader("accept", "application/json");
   req.setRequestHeader("Content-Type", "application/json");

   var token = me.getToken();
   if(token)
      req.setRequestHeader("Authorization", "Bearer " + token);

   if(modify)
      modify(apidat);

   me.signal("apistart", apidat);

   if(data)
      req.send(JSON.stringify(data));
   else
      req.send();
};

Api.prototype.Get = function(endpoint, params, success, error, always, modify)
{
   params = params || "";
   if(typeof params !== "string")
      params = params.toString();

   this.Generic(endpoint + "?" + params, success, error, always, "GET", null, modify);
};

Api.prototype.Post = function(endpoint, data, success, error, always, modify)
{
   this.Generic(endpoint, success, error, always, "POST", data, modify);
};

Api.prototype.Put = function(endpoint, data, success, error, always, modify)
{
   this.Generic(endpoint, success, error, always, "Put", data, modify);
};

Api.prototype.Chain = function(params, success, error, always, modify)
{
   this.Get("read/chain", params, success, error, always, modify);
};

Api.prototype.Listen = function(params, success, error, always, modify)
{
   this.Get("read/listen", params, success, error, always, modify);
};


// **********************
// ---- LONG POLLING ----
// **********************

function LongPoller(api, signalHandler, log)
{
   this.api = api;
   this.signal = signalHandler || ((n,d) => console.log("Ignoring signal " + name));
   this.log = log || ((msg, msg2, msg3) => console.log(msg, msg2, msg3));
   this.pending = [];
   this.errortime = 5000;
   this.ratetimeout = 1500;
   this.recallrids = [];
}

function LongPollData(lastId, statuses, lastListeners)
{
   this.statuses = statuses;
   this.lastId = lastId;
   this.lastListeners = lastListeners;
}

LongPoller.prototype.TryAbortAll = function()
{
   var count = 0;
   var me = this;
   this.pending.forEach(x =>
   {
      me.log("Aborting old long poller [" + x.rid + "]...");
      x.abortNow = true;
      x.request.abort();
      count++;
   });
   return count;
};

LongPoller.prototype.Update = function (lastId, statuses)
{
   this.log("Updating long poller, restarting with " + this.pending.length + " pending");

   //Just always abort, if they want an update, they'll GET one
   this.TryAbortAll();

   var emptyLastListeners = {};

   for(key in statuses)
      emptyLastListeners[key] = { "0" : "" };

   this.Repeater(new LongPollData(lastId, statuses, emptyLastListeners));
};

LongPoller.prototype.Repeater = function(lpdata)
{
   var me = this;

   me.signal("longpollstart", lpdata);

   var clearNotifications = Object.keys(lpdata.statuses).map(x => Number(x)).filter(x => x > 0);

   var recall = (apidat) => 
   {
      if(!me.recallrids.some(x => x === apidat.rid))
      {
         if(!apidat.abortNow)
         {
            me.recallrids.push(apidat.rid);
            me.Repeater(lpdata);
         }
         else
         {
            me.log("Tried to repeat from aborted long poller");
         }
      }
      else
      {
         me.log("Tried to repeat long poller multiple times");
      }
   };
   var reqsig = (name, apidat, msg) => 
   {
      if(msg)
         me.log(msg + " : " + me.api.FormatData(apidat));
      me.signal(name, ({request:apidat.request, lpdata:lpdata, data:apidat.data,
         clearNotifications:clearNotifications}));
   };

   var params = new URLSearchParams();
   params.append("actions", JSON.stringify({
      "lastId" : lpdata.lastId,
      "statuses" : lpdata.statuses,
      "clearNotifications" : clearNotifications,
      "chains" : [ "comment.0id", "activity.0id", "watch.0id",
         "user.1createUserId.2userId", "content.1parentId.2contentId.3contentId" ]
   }));

   if(lpdata.lastListeners)
   {
      params.append("listeners", JSON.stringify({
         "lastListeners" : lpdata.lastListeners,
         "chains" : [ "user.0listeners" ]
      }));
   }

   params.set("user","id,username,avatar");
   params.set("content","id,name");

   me.api.Listen(params, (apidat) =>
   {
      if(apidat.abortNow)
      {
         reqsig("longpollabort", apidat, "Long poll aborted, but received data");
      }
      else
      {
         var data = apidat.data;
         if(data)
         {
            if(data.lastId)
               lpdata.lastId = data.lastId;
            if(data.listeners)
               lpdata.lastListeners = data.listeners;
         }

         reqsig("longpollcomplete", apidat);
         recall(apidat);
      }
   }, (apidat) =>
   {
      var req = apidat.request;
      if(req.status === 400)
      {
         reqsig("longpollfatal", apidat, "Long poller failed fatally");
      }
      else if(req.status || req.networkError)
      {
         var timeout = me.errortime;
         if(req.status === 429)
            timeout = me.ratetimeout;
         reqsig("longpollerror", apidat, "Long poller failed normally, retrying in " + timeout + " ms");
         setTimeout(() => recall(apidat), timeout);
      }
      else
      {
         reqsig("longpollabort", apidat, "Long poller aborted normally");
      }
   }, (apidat) =>
   {
      //At the end, remove ourselves from the pending requests
      me.pending = me.pending.filter(x => x.rid !== apidat.rid);
      reqsig("longpollalways", apidat);
   }, (apidat) =>
   {
      me.pending.push(apidat);
   }); 
};


// ****************
// --- ENDPOINT ---
// ****************

function getUserLink(id) { return "?p=user-" + id; }
function getPageLink(id) { return "?p=page-" + id; }
function getCategoryLink(id) { return "?p=category-" + id; }

function getImageLink(id, size, crop, ignoreRatio)
{
   var img = apiroot + "/file/raw/" + id;
   var linkch = "?";
   if(size) { img += linkch + "size=" + size; linkch = "&"; }
   if(crop) { img += linkch + "crop=true"; linkch = "&"; }
   return img;
}

// *******************
// --- DATA FORMAT ---
// *******************

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

// *********************
// --- FRONTEND COOP ---
// *********************

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

function createComment(rawtext, markup) {
   return JSON.stringify({"m":markup}) + "\n" + rawtext;
}

//Does the given (agreed upon) page name type have discussions? This would be
//user, page, category, etc (those names)
function typeHasDiscussion(type) {
   return type === "page" || type === "user";
}
