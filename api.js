
var apiroot = "https://newdev.smilebasicsource.com/api";

//var apiGlobals = {
//   longpoll : {
//      pending : []
//   }
//};

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

   var apidat = { id: thisreqid, url: url, endpoint: endpoint, method : method, request : req};
   req.rid = thisreqid;

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
            callback(req.responseText ? JSON.parse(req.responseText) : null, req, apidat);
         else
            notifySuccess("Success: " + req.status + " - " + req.responseText);
      }
      else
      {
         //Also thrown on network error
         error(req);
      }
      signals.Add("apiend", apidat);
   });

   req.open(method, url);
   req.setRequestHeader("accept", "application/json");
   req.setRequestHeader("Content-Type", "application/json");

   var token = getToken(); //Do this as late as possible "just in case" (it makes no difference though)
   if(token)
      req.setRequestHeader("Authorization", "Bearer " + token);

   if(modify)
      modify(req);

   signals.Add("apistart", apidat);

   if(postData)
      req.send(JSON.stringify(postData));
   else
      req.send();
}

// **********************
// ---- LONG POLLING ----
// **********************

function LongPoller(signalHandler, log)
{
   this.log = log || ((msg, msg2, msg3) => console.log(msg, msg2, msg3));
   this.pending = [];
   this.signal = signalHandler;
   this.errortime = 5000;
   this.ratetimeout = 1500;
   //this.ratelimitextra = 500;
   this.logoutgoing = false;
         //var lpr = getLocalOption("longpollerrorrestart");
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
      x.abort();
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
   this.signal.Add("longpollstart", lpdata);

   var me = this;
   var clearNotifications = Object.keys(lpdata.statuses).map(x => Number(x)).filter(x => x > 0);

   var recall = () => me.Repeater(lpdata);
   var reqsig = (name, req, msg) => 
   {
      if(msg)
         me.log(msg + " - [" + req.rid + "] status " + req.status + " " + req.statusText);
      me.signal.Add(name, ({request:req,lpdata:lpdata,data:req.rcvdata,clearNotifications:clearNotifications}));
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

   quickApi("read/listen?" + params.toString(), (data,req) => //success
   {
      if(req.abortNow)
      {
         reqsig("longpollabort", req, "Long poll aborted, but received data");
      }
      else
      {
         if(data && data.lastId)
            lpdata.lastId = data.lastId;

         req.rcvdata = data;
         reqsig("longpollcomplete", req); //, "Long poll success");

         if(data.listeners)
            lpdata.lastListeners = data.listeners;

         recall();
      }
   }, req => //error
   {
      if(req.status === 400)
      {
         reqsig("longpollfatal", req, "Long poller failed fatally");
      }
      else if(req.status || req.networkError)
      {
         var timeout = me.errortime;
         if(req.status === 429)
         {
            timeout = me.ratetimeout;
            //var headers = req.getAllResponseHeaders();
            //console.log(headers);
            //var limitRemain = req.getResponseHeader("X-Rate-Limit-Remaining");
            //if(limitRemain)
            //   timeout = Number(limitRemain) + me.ratelimitextra;
         }
         reqsig("longpollerror", req, "Long poller failed normally, retrying in " + timeout + " ms");
         setTimeout(recall, timeout);
      }
      else
      {
         reqsig("longpollabort", req, "Long poller aborted normally");
      }
   }, undefined, req => //Always
   {
      me.pending = me.pending.filter(x => x.rid !== req.rid);
   }, undefined, req => //modify
   {
      me.pending.push(req);
      //globals.longpoller.pending = req;
   }, me.logoutgoing); //!getLocalOption("loglongpollrequest") /* Do we want this? No logging? */);
};
//function updateLongPoller()
//{
//   log.Info("Updating long poller, may restart");
//
//   //Just always abort, if they want an update, they'll GET one
//   tryAbortLongPoller();
//
//   if(!getToken())
//      return;
//
//   var cid = getActiveDiscussion();
//
//   //A full reset haha great
//   if(cid)
//   {
//      globals.longpoller.lastlisteners = { };
//      globals.longpoller.lastlisteners[String(cid)] = { "0" : "" }; 
//   }
//   else
//   {
//      globals.longpoller.lastlisteners = null;
//   }
//
//   longpollRepeater();
//}


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
