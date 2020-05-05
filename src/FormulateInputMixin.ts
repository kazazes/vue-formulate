/**
 * Default base for input components.
 */

import { Mixins, Prop } from "vue-property-decorator";
import { Context, Vue } from "./libs/context";
import FormulateInput from "./FormulateInput.vue";

@Mixins(FormulateInput)
export default class FormulateInputMixin extends Vue {
  @Prop({ type: Context, required: true }) context!: Context;

  get type() {
    return this.context.type;
  }

  get id() {
    return this.context.id;
  }

  get attributes() {
    return this.context.attributes || {};
  }

  get hasValue() {
    return !!this.context.model;
  }

}
