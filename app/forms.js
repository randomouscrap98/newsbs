//Carlos Sanchez
//9-15-2019
//Deps: jquery, constants

//Lots of dependencies
//function MyForm(form, request, generate, logger)
//{
//   this.form = form;
//   this.request = request;
//   this.generate = generate;
//   this.Log = logger;
//}

//MyForm.prototype.SetResponseError = function(response)
//{
//   this.SetError(this.request.GetResponseErrors(response));
//};

//MyForm.prototype.SingleUseSuccess = function(data)
//{
//   var submit = this.GetSubmit();
//   this.generate.SetElementIcon(submit, IMAGES.Success);
//};

//MyForm.prototype.SetupAjax = function(url, dataConverter, success)
//{
//   var submit = this.GetSubmit();
//   var me = this;
//
//   if(!submit)
//   {
//      this.Log.Error("No 'submit' input on form for " + url);
//      return;
//   }
//
//   this.form.submit(function()
//   {
//      try
//      {
//         me.SetRunning();
//         var ajax = me.request.RunBasicAjax(url, dataConverter(me.form));
//         ajax.always(me.ClearRunning);
//         ajax.done(function(data, status, xhr)
//         {
//            if(success) success(me.form,data,status,xhr);
//         });
//         ajax.fail(me.SetResponseError);
//         //function(data)
//         //{
//         //   me.SetResponseError(data);
//         //});
//      }
//      catch(ex)
//      {
//         me.Log.Error("EXCEPTION during form submit: " + ex);
//         me.ClearRunning();
//         me.SetError(ex);
//      }
//      return false;
//   });
//};
