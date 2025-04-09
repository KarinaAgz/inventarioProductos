sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageBox",
    "sap/ui/core/Item",
    "sap/ui/Device"
], function (Controller, Fragment, JSONModel, MessageToast, Filter, FilterOperator, Spreadsheet, MessageBox, Item, Device) {
    "use strict";

    return Controller.extend("logaligroup.inventorymanager.controller.Products", {
        onInit: function () {
        

            // Inicializar el modelo app para el conteo de filas filtradas
            var oAppModel = new JSONModel({
                filteredCount: 0
            });
            this.getOwnerComponent().setModel(oAppModel, "app");

            // Obtener el modelo OData por defecto
            var oModel = this.getOwnerComponent().getModel();

            // Forzar la carga de datos para Products
            oModel.read("/Products", {
                success: function (oData) {
                    
                    // Forzar la recarga del binding de la tabla
                    var oTable = this.byId("productsTable");
                    var oBinding = oTable.getBinding("items");
                    oBinding.refresh(true);
                    // Depurar el binding después de la recarga
                    oBinding.attachEventOnce("dataReceived", function () {
                        console.log("Binding de la tabla actualizado. Número de elementos:", oBinding.getLength());
                        console.log("Contextos:", oBinding.getContexts());
                        if (oBinding.getLength() === 0) {
                            MessageToast.show("No hay productos para mostrar después de la recarga inicial.");
                        }
                    }.bind(this));
                }.bind(this),
                error: function (oError) {
                    console.error("Error al cargar productos:", oError);
                    MessageToast.show("Error al cargar los productos: " + oError.message);
                }
            });

            // Forzar la carga de datos para Categories
            oModel.read("/Categories", {
                success: function (oData) {
                    console.log("Categorías cargadas exitosamente:", oData);
                   
                },
                error: function (oError) {
                    console.error("Error al cargar categorías:", oError);
                    MessageToast.show("Error al cargar las categorías: " + oError.message);
                }
            });

            // Actualizar el conteo de filas filtradas cuando la tabla termine de cargar
            var oTable = this.byId("productsTable");
            oTable.attachUpdateFinished(function () {
                console.log("Evento updateFinished disparado. Elementos en la tabla:", oTable.getItems().length);
                this._updateFilteredCount();
            }.bind(this));
        },

        onFilter: function () {
            var oTable = this.byId("productsTable");
            oTable.setBusy(true);

            var sQuery = this.byId("searchField").getValue();
            var sPriceMin = this.byId("priceMinFilter").getValue();
            var sPriceMax = this.byId("priceMaxFilter").getValue();
            var sStockMin = this.byId("stockMinFilter").getValue();
            var sDiscontinued = this.byId("discontinuedFilter").getSelectedKey() || "all";
            var sCategory = this.byId("categoryFilter").getSelectedKey() || "all";

            console.log("sCategory:", sCategory); // Depurar el valor de sCategory

            var aFilters = [];
            if (sQuery) {
                aFilters.push(new Filter("ProductName", FilterOperator.Contains, sQuery));
            }
            if (sPriceMin) {
                aFilters.push(new Filter("UnitPrice", FilterOperator.GE, parseFloat(sPriceMin) || 0));
            }
            if (sPriceMax) {
                aFilters.push(new Filter("UnitPrice", FilterOperator.LE, parseFloat(sPriceMax) || 0));
            }
            if (sStockMin) {
                aFilters.push(new Filter("UnitsInStock", FilterOperator.GE, parseInt(sStockMin) || 0));
            }
            if (sDiscontinued !== "all") {
                var bDiscontinued = sDiscontinued === "discontinued";
                aFilters.push(new Filter("Discontinued", FilterOperator.EQ, bDiscontinued));
            }
            if (sCategory !== "all") {
                aFilters.push(new Filter("CategoryID", FilterOperator.EQ, parseInt(sCategory)));
            }

            console.log("Filtros aplicados:", aFilters); // Depurar los filtros

            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);

            oBinding.attachEventOnce("dataReceived", function () {
                oTable.setBusy(false);
                this._updateFilteredCount();
                if (oBinding.getLength() === 0) {
                    MessageToast.show("No se encontraron productos con los filtros aplicados.");
                }
            }.bind(this));
        },

        onClearFilters: function () {
            this.byId("searchField").setValue("");
            this.byId("priceMinFilter").setValue("");
            this.byId("priceMaxFilter").setValue("");
            this.byId("stockMinFilter").setValue("");
            this.byId("discontinuedFilter").setSelectedKey("all");
            this.byId("categoryFilter").setSelectedKey("all");

            var oTable = this.byId("productsTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter([]);
            this._updateFilteredCount();
        },

        onRefresh: function () {
            var oTable = this.byId("productsTable");
            var oBinding = oTable.getBinding("items");
            oTable.setBusy(true);
            oBinding.refresh(true);

            oBinding.attachEventOnce("dataReceived", function () {
                oTable.setBusy(false);
                MessageToast.show("Datos actualizados.");
                this._updateFilteredCount();
            }.bind(this));
        },

        onExport: function () {
            var oTable = this.byId("productsTable");
            var oBinding = oTable.getBinding("items");
            var aItems = oBinding.getContexts().map(function (oContext) {
                return oContext.getObject();
            });

            var oSheet = new Spreadsheet({
                workbook: {
                    columns: [
                        { label: "ID del Producto", property: "ProductID", type: "Number" },
                        { label: "Nombre del Producto", property: "ProductName" },
                        { label: "Precio Unitario", property: "UnitPrice", type: "Number" },
                        { label: "Unidades en Stock", property: "UnitsInStock", type: "Number" },
                        { label: "ID de Categoría", property: "CategoryID", type: "Number" }
                    ]
                },
                dataSource: aItems,
                fileName: "Reporte_Productos.xlsx"
            });

            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },

        onEditProduct: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext();
            var oProduct = oContext.getObject();

            var oEditModel = new JSONModel(oProduct);
            this.getView().setModel(oEditModel, "edit");

            if (!this._oEditDialog) {
                Fragment.load({
                    name: "logaligroup.inventorymanager.fragment.EditProductDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oEditDialog = oDialog;
                    this.getView().addDependent(this._oEditDialog);
                    this._oEditDialog.open();
                }.bind(this));
            } else {
                this._oEditDialog.open();
            }
        },

        onSaveProduct: function () {
            var oEditModel = this.getView().getModel("edit");
            var oProduct = oEditModel.getData();
            var oModel = this.getView().getModel();

            oModel.update("/Products(" + oProduct.ProductID + ")", oProduct, {
                success: function () {
                    MessageToast.show("Producto actualizado correctamente.");
                    this._oEditDialog.close();
                    this.getView().getModel().refresh();
                }.bind(this),
                error: function (oError) {
                    MessageToast.show("Error al actualizar el producto: " + oError.message);
                }
            });
        },

        onCancelEdit: function () {
            this._oEditDialog.close();
        },

        onDeleteProduct: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext();
            var sProductID = oContext.getProperty("ProductID");

            MessageBox.confirm("¿Estás seguro de que deseas eliminar este producto?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var oModel = this.getView().getModel();
                        oModel.remove("/Products(" + sProductID + ")", {
                            success: function () {
                                MessageToast.show("Producto eliminado correctamente.");
                                oModel.refresh();
                            }.bind(this),
                            error: function (oError) {
                                MessageToast.show("Error al eliminar el producto: " + oError.message);
                            }
                        });
                    }
                }.bind(this)
            });
        },

        onSelectionChange: function (oEvent) {
            // Lógica para manejar la selección (puedes implementarla más adelante)
            sap.m.MessageToast.show("Selección cambiada.");
        },

        _updateFilteredCount: function () {
            var oTable = this.byId("productsTable");
            var oBinding = oTable.getBinding("items");
            var iCount = oBinding ? oBinding.getLength() : 0;

            var oAppModel = this.getView().getModel("app");
            oAppModel.setProperty("/filteredCount", iCount);
            console.log("Conteo de filas filtradas actualizado:", iCount);
        }
    });
});