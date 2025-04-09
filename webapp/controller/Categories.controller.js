sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function(Controller,Fragment,JSONModel,MessageToast){
    "use strict";

    return Controller.extend("logaligroup.inventorymanager.controller.Categories",{
        onInit:function(){
            
        },
        onAddCategory:function(){
            //creo modelo para el dialogo
            var oNewCategoryModel=new JSONModel({
                CategoryName: "",
                Description:""
            });
            this.getView().setModel(oNewCategoryModel,"newCategory");

            if(!this._oAddCategory){
                Fragment.load({
                    name:"logaligroup.inventorymanager.fragment.AddCategoryDialog",
                    controller:this
                }).then(function(oDialog){
                    this._oAddCategoryDialog=oDialog;
                    this._oAddCategoryDialog.open();
                }.bind(this));
            }else{
                this._oAddCategoryDialog.open();
            }
        },
        onSaveCategory:function(){
            var oNewCategoryModel=this.getView().getModel("newCategory");
            var oCategory=oNewCategoryModel.getData();
            var oModel=this.getView().getModel();

            oModel.create("/Categorias",oCategory,{
                success:function(){
                    MessageToast.show("Categoria creada correctamente");
                    this._oAddCategoryDialog.close();
                    oModel.refresh();

                }.bind(this),
                error:function(oError){
                    MessageToast.show("Error al crear la categoria" +oError.message);
                }
            });
        },
        onCancelAddCategory:function(){
            this._oAddCategoryDialog.close();
        }
    });
});