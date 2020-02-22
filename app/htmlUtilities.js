
function HtmlUtilities(logger) 
{ 
   this.logger = logger;
}

HtmlUtilities.prototype.SetSingletonAttribute = function(element, container, attribute)
{
   container.find("*").removeAttr(attribute);
   element.attr(attribute, "");
   element.focus();
};

