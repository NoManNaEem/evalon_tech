/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { roundDecimals } from "@web/core/utils/numbers";
import { rpc } from "@web/core/network/rpc";

// Save original methods
const superSetup = PosOrderline.prototype.setup;
const superSetQuantity = PosOrderline.prototype.set_quantity;
const superPrepareBaseLine = PosOrderline.prototype.prepareBaseLineForTaxesComputationExtraValues;
const superExport = PosOrderline.prototype.export_as_JSON || function () { return {}; };
const superGetDisplayData = PosOrderline.prototype.getDisplayData;

async function loadFixedDiscountSetting() {
    try {
        const enabled = await rpc("/web/dataset/call_kw", {
            model: "ir.config_parameter",
            method: "get_param",
            args: ["point_of_sale_fixed_discount.fixed_discount_pos"],
            kwargs: { default: false },
        });
        return enabled === "True" || enabled === true;
    } catch (err) {
        console.error("Error fetching fixed discount setting:", err);
        return false;
    }
}
loadFixedDiscountSetting().then(enabled => {
    if (!enabled) {
        console.log("Fixed Discount is disabled. No patch applied.");
        return;
    }
    patch(PosOrderline.prototype, {
        setup(vals) {
            superSetup.call(this, vals);
            this.fixed_discount = 0;
            // Convert existing percentage discount to fixed
            if (this.discount > 0) {
                const subtotal = this.get_unit_price() * this.qty;
                if (subtotal > 0) {
//                    const priceDigits = this.models["decimal.precision"].find(dp => dp.name === "Product Price").digits;
                    this.fixed_discount = roundDecimals((this.discount / 100) * subtotal);
                }
            }
        },
        get custom_discount_value() {
            return this.fixed_discount || 0;
        },
_update_discount_from_fixed() {
    const qty = this.get_quantity();
    const unitPrice = this.get_unit_price();

    const currencyDigits =
        (this.order_id?.pos?.currency?.decimals) || 2;

    const subtotal = unitPrice * qty;         // full line value
    const totalFixed = this.fixed_discount || 0;   // discount for whole line

    // 🔹 Convert to % only for internal Odoo math
    const pct = subtotal > 0 ? (totalFixed * 100) / subtotal : 0;
    this.discount = roundDecimals(pct, 6);

    // 🔹 Adjust effective unit price so total matches
    const newUnit = subtotal > 0
        ? (subtotal - totalFixed) / qty
        : unitPrice;

    this.price = roundDecimals(newUnit, currencyDigits);
},


//        _update_discount_from_fixed() {
//            const subtotal = this.get_unit_price() * this.get_quantity();
//            this.discount = subtotal > 0
//                ? Math.min(roundDecimals((this.fixed_discount / subtotal) * 100, 2), 100)
//                : 0;
//        },

//        set_discount(discount) {
//            const priceDigits = this.models["decimal.precision"].find(dp => dp.name === "Product Price").digits;
//            this.fixed_discount = roundDecimals(Math.max(parseFloat(discount) || 0, 0), priceDigits);
//            this._update_discount_from_fixed();
//            this.order_id.recomputeOrderData();
//            this.setDirty();
//        },
set_discount(discount) {
    const priceDigits = this.models["decimal.precision"]
        .find(dp => dp.name === "Product Price").digits;

    // store discount as TOTAL line discount
    this.fixed_discount = roundDecimals(
        Math.max(parseFloat(discount) || 0, 0),
        priceDigits
    );

    this._update_discount_from_fixed();
    this.order_id.recomputeOrderData();
    this.setDirty();
},

//getDisplayData() {
//    const data = superGetDisplayData.call(this);
//
//    const qty = this.get_quantity();
//    const unitBefore = this.get_unit_price();      // original price
//    const unitAfter = this.price;                  // discounted unit price
//    const lineBefore = unitBefore * qty;           // subtotal before discount
//
//    return {
//        ...data,
//        debugger;
//        fixedDiscount: (this.fixed_discount || 0).toString(),
//
//        // 🔹 new fields
//        unitPriceBefore: unitBefore,
//        unitPriceAfter: unitAfter,
//        lineSubtotalBeforeDiscount: lineBefore,
//    };
//},




        set_quantity(quantity, keep_price) {
            const res = superSetQuantity.call(this, quantity, keep_price);
            if (this.fixed_discount > 0) this._update_discount_from_fixed();
            return res;
        },
        prepareBaseLineForTaxesComputationExtraValues(customValues = {}) {
            const res = superPrepareBaseLine.call(this, customValues);
            if (this.fixed_discount > 0) this._update_discount_from_fixed();
            return res;
        },
        getDisplayData() {
            const data = superGetDisplayData.call(this);

            const qty = this.get_quantity();
            const unitBefore = this.get_unit_price();   // original price
            const unitAfter = this.price;               // discounted unit price
            const lineBefore = unitBefore * qty;        // subtotal before discount

            return {
                ...data,

                fixedDiscount: (this.fixed_discount || 0).toString(),

                // 🔹 Extra values for receipt & templates
                unitPriceBefore: unitBefore,
                unitPriceAfter: unitAfter,
                lineSubtotalBeforeDiscount: lineBefore,
            };
        },
        export_as_JSON() {
            const json = superExport.call(this);

            const qty = this.get_quantity();
            const unitBefore = this.get_unit_price();
            const unitAfter = this.price;
            const lineBefore = unitBefore * qty;

            return {
                ...json,
                fixedDiscount: this.fixed_discount || 0,
                unitPriceBefore: unitBefore,
                unitPriceAfter: unitAfter,
                lineSubtotalBeforeDiscount: lineBefore,
            };
        },


    });
});