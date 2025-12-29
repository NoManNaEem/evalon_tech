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
                    const priceDigits = this.models["decimal.precision"].find(dp => dp.name === "Product Price").digits;
                    this.fixed_discount = roundDecimals((this.discount / 100) * subtotal, priceDigits);
                }
            }
        },
        get custom_discount_value() {
            return this.fixed_discount || 0;
        },
        _update_discount_from_fixed() {
            const subtotal = this.get_unit_price() * this.get_quantity();
            this.discount = subtotal > 0
                ? Math.min(roundDecimals((this.fixed_discount / subtotal) * 100, 2), 100)
                : 0;
        },
        set_discount(discount) {
            const priceDigits = this.models["decimal.precision"].find(dp => dp.name === "Product Price").digits;
            this.fixed_discount = roundDecimals(Math.max(parseFloat(discount) || 0, 0), priceDigits);
            this._update_discount_from_fixed();
            this.order_id.recomputeOrderData();
            this.setDirty();
        },
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
            return {
                ...data,
                fixedDiscount: this.custom_discount_value.toString(),
            };
        },
    });
});