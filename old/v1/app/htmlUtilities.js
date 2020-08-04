//Carlos Sanchez
//2-22-2020
//REQUIRES JQUERY!
//Requires arrow functions

function HtmlUtilities(logger) 
{ 
   this.logger = logger;
   this.cacheID = "htmlUtilCache";
}

HtmlUtilities.prototype.SetSingletonAttribute = function(element, container, attribute)
{
   container.find("*").removeAttr(attribute);
   element.attr(attribute, "");
   element.focus();
};

HtmlUtilities.prototype.GetCache = function()
{
   var cache = $(this.cacheID);

   if(!cache[0])
   {
      this.logger.Info("Creating element cache container (for preloading/etc)");
      cache = $("<div></div>");
      cache.css("display", "none");
      cache.attr("id", this.cacheID);
      $(document.body).append(cache);
   }

   return cache;
};

HtmlUtilities.prototype.PreloadImages = function(images)
{
   //Preload images. Eventually, make sure you're not preloading images twice.
   var container = this.GetCache();
   images.forEach(img => $("<img/>").attr("src", img).appendTo(container));
   this.logger.Debug("Preloading images");
};

HtmlUtilities.prototype.GetParams = function(url)
{
   return new URLSearchParams((url.split("?")[1] || "").split("#")[0]);
};
