sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("logaligroup.inventorymanager.controller.Reports", {
        onInit: function () {
            // Crear un JSONModel vacío inicialmente
            var oReportModel = new sap.ui.model.json.JSONModel({
                CategorySummary: [],
                StockSummary: []
            });
            this.getView().setModel(oReportModel, "reportModel");

            var oModel = this.getOwnerComponent().getModel();
            if (oModel) {
                oModel.metadataLoaded().then(function () {
                    this._loadCategorySummary();
                    this._loadStockSummary();
                }.bind(this));
            } else {
                console.error("Modelo OData no está disponible en onInit");
            }
        },

        _loadCategorySummary: function () {
            var oModel = this.getOwnerComponent().getModel();
            var that = this;

            oModel.read("/Products", {
                success: function (oData) {
                    var aCategories = [];
                    var mCategoryMap = {};

                    oData.results.forEach(function (oProduct) {
                        var sCategoryId = oProduct.CategoryID;
                        if (!mCategoryMap[sCategoryId]) {
                            mCategoryMap[sCategoryId] = { CategoryID: sCategoryId, Count: 0, CategoryName: "Categoría " + sCategoryId };
                        }
                        mCategoryMap[sCategoryId].Count++;
                    });

                    oModel.read("/Categories", {
                        success: function (oCategoryData) {
                            oCategoryData.results.forEach(function (oCategory) {
                                if (mCategoryMap[oCategory.CategoryID]) {
                                    mCategoryMap[oCategory.CategoryID].CategoryName = oCategory.CategoryName;
                                }
                            });

                            for (var sKey in mCategoryMap) {
                                aCategories.push(mCategoryMap[sKey]);
                            }

                            // Actualizar el JSONModel existente
                            var oReportModel = that.getView().getModel("reportModel");
                            oReportModel.setProperty("/CategorySummary", aCategories);
                        },
                        error: function (oError) {
                            MessageToast.show("Error al cargar las categorías: " + oError.message);
                        }
                    });
                },
                error: function (oError) {
                    MessageToast.show("Error al cargar los datos de productos: " + oError.message);
                }
            });
        },

        _loadStockSummary: function () {
            var oModel = this.getOwnerComponent().getModel();
            var that = this;

            oModel.read("/Products", {
                success: function (oData) {
                    var iLowStock = oData.results.filter(function (oProduct) {
                        return oProduct.UnitsInStock < 10;
                    }).length;
                    var iNormalStock = oData.results.length - iLowStock;

                    var aStockSummary = [
                        { Status: "Stock Bajo", Count: iLowStock },
                        { Status: "Stock Normal", Count: iNormalStock }
                    ];

                    // Actualizar el JSONModel existente
                    var oReportModel = that.getView().getModel("reportModel");
                    oReportModel.setProperty("/StockSummary", aStockSummary);
                },
                error: function (oError) {
                    MessageToast.show("Error al cargar los datos de stock: " + oError.message);
                }
            });
        },

        onDownloadPDF: function () {
            MessageToast.show("Descargando reporte en PDF... (simulando)");
        }
    });
});