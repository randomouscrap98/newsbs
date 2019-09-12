//Carlos Sanchez
//9-11-2019

$( document ).ready(function()
{
   var temp = MakeContent("this\n\n\n\n\n\n\nis\n\n\n\n\n\n\nsome\n\n\n\n\n\n\n\n\ncontent");
   $("#leftscroller").append(temp);
});

function MakeContent(text)
{
   var content = $("<div></div>");
   content.addClass("content");
   content.text(text);
   return content;
}
