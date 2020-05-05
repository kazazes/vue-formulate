import { map, arrayify, shallowEqualObjects } from './utils'
import { Component } from "vue-property-decorator";
import { Vue } from "vue/types/vue";
import { ComponentOptions } from "vue";

@Component
export class Context extends Vue {
  classification: any;
  options: any;
  optionGroups: any;
  showValue: any;
  localAttributes: any;
  id: any;
  defaultId: any;
  private errorBehavior: Boolean;
  name: any;
  labelPosition: any;
  validationName: any;
  label: any;
  type: any;
  uploadUrl: any;
  attributes: {};
  model: any;
  constructor(options?: ComponentOptions<any>) {
    super(options);
  }

  /**
   * Defines the model used throughout the existing context.
   * @param {object} context
   */
  static defineModel (context: Context) {
    return Object.defineProperty(context, 'model', {
      get: this.modelGetter.bind(this),
      set: this.modelSetter.bind(this)
    })
  }


  /**
   * Given (this.type), return an object to merge with the context
   * @return {object}
   * @return {object}
   */
  typeContext () {
    switch (this.classification) {
      case 'select':
        return {
          options: this.createOptionList.call(this, this.options),
          optionGroups: this.optionGroups ? map(this.optionGroups, (k, v) => this.createOptionList.call(this, v)) : false,
          placeholder: this.$attrs.placeholder || false
        }
      case 'slider':
        return { showValue: !!this.showValue }
      default:
        if (this.options) {
          return {
            options: this.createOptionList.call(this, this.options)
          }
        }
        return {}
    }
  }

  /**
   * Reducer for attributes that will be applied to each core input element.
   * @return {object}
   */
  elementAttributes () {
    const attrs = Object.assign({}, this.localAttributes)
    // pass the ID prop through to the root element
    if (this.id) {
      attrs.id = this.id
    } else {
      attrs.id = this.defaultId
    }
    // pass an explicitly given name prop through to the root element
    if (this.hasGivenName()) {
      attrs.name = this.name
    }

    return attrs
  }

  /**
   * Determine the a best-guess location for the label (before or after).
   * @return {string} before|after
   */
  logicalLabelPosition () {
    if (this.labelPosition) {
      return this.labelPosition
    }
    switch (this.classification) {
      case 'box':
        return 'after'
      default:
        return 'before'
    }
  }

  /**
   * The validation label to use.
   */
  mergedValidationName () {
    if (this.validationName) {
      return this.validationName
    }
    if (typeof this.name === 'string') {
      return this.name
    }
    if (this.label) {
      return this.label
    }
    return this.type
  }

  /**
   * Use the uploadURL on the input if it exists, otherwise use the uploadURL
   * that is defined as a plugin option.
   */
  mergedUploadUrl () {
    return this.uploadUrl || this.$formulate.getUploadUrl()
  }

  /**
   * Determines if the field should show it's error (if it has one)
   * @return {boolean}
   */
  showValidationErrors () {
    if (this.showErrors || this.formShouldShowErrors) {
      return true
    }
    if (this.classification === 'file' && this.uploadBehavior === 'live' && this.context.model) {
      return true
    }
    return this.behavioralErrorVisibility
  }

  /**
   * Return the element’s name, or select a fallback.
   */
  nameOrFallback () {
    if (this.name === true && this.classification !== 'button') {
      return `${this.type}_${this.elementAttributes.id}`
    }
    if (this.name === false || (this.classification === 'button' && this.name === true)) {
      return false
    }
    return this.name
  }

  /**
   * determine if an input has a user-defined name
   */
  hasGivenName () {
    return typeof this.name !== 'boolean'
  }

  /**
   * Determines if this formulate element is v-modeled or not.
   */
  isVmodeled () {
    return !!(this.$options.propsData.hasOwnProperty('formulateValue') &&
      this._events &&
      Array.isArray(this._events.input) &&
      this._events.input.length)
  }

  /**
   * Given an object or array of options, create an array of objects with label,
   * value, and id.
   * @param {array|object}
   * @return {array}
   */
  createOptionList (options) {
    if (!Array.isArray(options) && options && typeof options === 'object') {
      const optionList = []
      const that = this
      for (const value in options) {
        optionList.push({ value, label: options[value], id: `${that.elementAttributes.id}_${value}` })
      }
      return optionList
    }
    return options
  }

  /**
   * These are errors we that have been explicity passed to us.
   */
  explicitErrors () {
    return arrayify(this.errors)
      .concat(arrayify(this.error))
  }

  /**
   * The merged errors computed property.
   */
  allErrors () {
    return this.explicitErrors
               .concat(arrayify(this.validationErrors))
  }

  /**
   * Does this computed property have errors
   */
  hasErrors () {
    return !!this.allErrors.length
  }

  /**
   * Checks if form has actively visible errors.
   */
  hasVisibleErrors () {
    return ((this.validationErrors && this.showValidationErrors) || !!this.explicitErrors.length)
  }

  /**
   * Bound into the context object.
   */
  blurHandler () {
    this.$emit('blur')
    if (this.errorBehavior === 'blur') {
      this.behavioralErrorVisibility = true
    }
  }



  /**
   * Get the value from a model.
   **/
  modelGetter () {
    const model = this.isVmodeled ? 'formulateValue' : 'internalModelProxy'
    if (this.type === 'checkbox' && !Array.isArray(this[model]) && this.options) {
      return []
    }
    if (!this[model]) {
      return ''
    }
    return this[model]
  }

  /**
   * Set the value from a model.
   **/
  modelSetter (value) {
    if (!shallowEqualObjects(value, this.internalModelProxy)) {
      this.internalModelProxy = value
    }
    this.$emit('input', value)
    if (this.context.name && typeof this.formulateFormSetter === 'function') {
      this.formulateFormSetter(this.context.name, value)
    }
  }

}

/**
 * For a single instance of an input, export all of the context needed to fully
 * render that element.
 * @return {object}
 */
export default {
  context () {
    return defineModel.call(this, {
      type: this.type,
      value: this.value,
      name: this.nameOrFallback,
      hasGivenName: this.hasGivenName,
      classification: this.classification,
      component: this.component,
      id: this.id || this.defaultId,
      hasLabel: (this.label && this.classification !== 'button'),
      label: this.label,
      labelPosition: this.logicalLabelPosition,
      attributes: this.elementAttributes,
      performValidation: this.performValidation.bind(this),
      blurHandler: blurHandler.bind(this),
      imageBehavior: this.imageBehavior,
      uploadUrl: this.mergedUploadUrl,
      uploader: this.uploader || this.$formulate.getUploader(),
      uploadBehavior: this.uploadBehavior,
      preventWindowDrops: this.preventWindowDrops,
      hasValidationErrors: this.hasValidationErrors,
      ...this.typeContext
    })
  },
  // Used in sub-context
  nameOrFallback,
  hasGivenName,
  typeContext,
  elementAttributes,
  logicalLabelPosition,
  mergedUploadUrl,

  // These items are not passed as context
  isVmodeled,
  mergedValidationName,
  explicitErrors,
  allErrors,
  hasErrors,
  hasVisibleErrors,
  showValidationErrors
}
