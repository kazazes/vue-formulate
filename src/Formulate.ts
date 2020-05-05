import library from './libs/library'
import rules, { Rule, Rules } from "./libs/rules";
import mimes from './libs/mimes'
import FileUpload from './FileUpload'
import { arrayify, parseLocale } from './libs/utils'
import isPlainObject from 'is-plain-object'
import { en } from '@braid/vue-formulate-i18n'
import fauxUploader from './libs/faux-uploader'
import FormulateInput from './FormulateInput.vue'
import FormulateForm from './FormulateForm.vue'
import FormulateErrors from './FormulateErrors.vue'
import FormulateInputGroup from './FormulateInputGroup.vue'
import FormulateInputBox from './inputs/FormulateInputBox.vue'
import FormulateInputText from './inputs/FormulateInputText.vue'
import FormulateInputFile from './inputs/FormulateInputFile.vue'
import FormulateInputButton from './inputs/FormulateInputButton.vue'
import FormulateInputSelect from './inputs/FormulateInputSelect.vue'
import FormulateInputSlider from './inputs/FormulateInputSlider.vue'
import FormulateInputTextArea from './inputs/FormulateInputTextArea.vue'
import  {Component} from "vue";
import { Context } from "./libs/context";
import {Vue} from "vue-property-decorator";

/**
 * The base formulate library.
 */
class Formulate {
  private options: {
    uploader: string;
    uploadUrl?: string;
    locales: any;
    fileUrlKey: string;
    rules?: Rules;
    components?: any;
    locale?: string;
    library?: { [key: string]: any };
    idPrefix?: any;
    errorHandler: (err: any, formName: string) => any
  };
  private readonly defaults: any;
  private registry: Map<any, any>;
  private idRegistry: any;
  selectedLocale: any
  /**
   * Instantiate our base options.
   */
  constructor () {
    this.options = {
      errorHandler(err: any, formName: string): any {
      }, fileUrlKey: "", locales: undefined, library: {}}
    this.defaults = {
      components: {
        FormulateForm,
        FormulateInput,
        FormulateErrors,
        FormulateInputBox,
        FormulateInputText,
        FormulateInputFile,
        FormulateInputGroup,
        FormulateInputButton,
        FormulateInputSelect,
        FormulateInputSlider,
        FormulateInputTextArea
      },
      library,
      rules,
      mimes,
      locale: false,
      uploader: fauxUploader,
      uploadUrl: false,
      fileUrlKey: 'url',
      uploadJustCompleteDuration: 1000,
      errorHandler: (err: any) => err,
      plugins: [ en ],
      locales: {},
      idPrefix: 'formulate-'
    }
    this.registry = new Map()
    this.idRegistry = {}
  }

  /**
   * Install vue formulate, and register it’s components.
   */
  install (Vue: Vue, options) {
    Vue.$formulate = this
    this.options = this.defaults
    var plugins = this.defaults.plugins
    if (options && Array.isArray(options.plugins) && options.plugins.length) {
      plugins = plugins.concat(options.plugins)
    }
    plugins.forEach((plugin: (arg0: this) => any) => (typeof plugin === 'function') ? plugin(this) : null)
    this.extend(options || {})
    for (let componentName in this.options.components) {

      Vue.component(componentName, this.options.components[componentName])
    }
  }

  /**
   * Produce a deterministically generated id based on the sequence by which it
   * was requested. This should be *theoretically* the same SSR as client side.
   * However, SSR and deterministic ids can be very challenging, so this
   * implementation is open to community review.
   */
  nextId (vm: { $route: { path: string } }) {
    const path = vm.$route && vm.$route.path || false
    const pathPrefix = path ? vm.$route.path.replace(/[\/\\.\s]/g, '-') : 'global';
    if (!Object.prototype.hasOwnProperty.call(this.idRegistry, pathPrefix)) {
      this.idRegistry[pathPrefix] = 0;
    }
    return `${this.options.idPrefix}${pathPrefix}-${++this.idRegistry[pathPrefix]}`
  }

  /**
   * Given a set of options, apply them to the pre-existing options.
   * @param {Object} extendWith
   */
  extend (extendWith: any) {
    if (typeof extendWith === 'object') {
      this.options = this.merge(this.options, extendWith)
      return this
    }
    throw new Error(`VueFormulate extend() should be passed an object (was ${typeof extendWith})`)
  }

  /**
   * Create a new object by copying properties of base and mergeWith.
   * Note: arrays don't overwrite - they push
   *
   * @param {Object} base
   * @param {Object} mergeWith
   * @param {boolean} concatArrays
   */
  merge (base: any, mergeWith: any, concatArrays = true) {
    let merged: any = {};
    for (let key in base) {
      if (base.hasOwnProperty(key) && mergeWith.hasOwnProperty(key)) {
        if (isPlainObject(mergeWith[key]) && isPlainObject(base[key])) {
          merged[key] = this.merge(base[key], mergeWith[key], concatArrays)
        } else if (concatArrays && Array.isArray(base[key]) && Array.isArray(mergeWith[key])) {
          merged[key] = base[key].concat(mergeWith[key])
        } else {
          merged[key] = mergeWith[key]
        }
      } else {
        merged[key] = base[key]
      }
    }
    for (let prop in mergeWith) {
      if (mergeWith.hasOwnProperty(prop) && !merged.hasOwnProperty(prop)) {
        merged[prop] = mergeWith[prop]
      }
    }
    return merged
  }

  /**
   * Determine what "class" of input this element is given the "type".
   * @param {string} type
   */
  classify (type: string) {
    if (this.options.library && this.options.library.hasOwnProperty(type)) {
      return this.options.library[type].classification
    }
    return 'unknown'
  }

  /**
   * Determine what type of component to render given the "type".
   * @param {string} type
   */
  component (type: string) {
    if (this.options.library && this.options.library.hasOwnProperty(type)) {
      return this.options.library[type].component
    }
    return false
  }

  /**
   * Get validation rules.
   * @return {object} object of validation functions
   */
  rules (rules = {}) {
    return { ...this.options.rules, ...rules }
  }

  /**
   * Attempt to get the vue-i18n configured locale.
   */
  i18n (vm: Vue) {
    if (!vm.$i18n) return false;
    if (vm.$i18n && vm.$i18n.locale) {
      return vm.$i18n.locale
    }
    return false
  }

  /**
   * Select the proper locale to use.
   */
  getLocale (vm: Component) {
    if (!this.selectedLocale) {
      this.selectedLocale = [
        this.options.locale,
        this.i18n(vm),
        'en'
      ].reduce((selection, locale) => {
        if (selection) {
          return selection
        }
        if (locale) {
          const option = parseLocale(locale)
            .find((locale: string | number | symbol) => Object.prototype.hasOwnProperty.call(this.options.locales, locale))
          if (option) {
            selection = option
          }
        }
        return selection
      }, false)
    }
    return this.selectedLocale
  }

  /**
   * Get the validation message for a particular error.
   */
  validationMessage (rule: any, validationContext:any, vm: Component) {
    const generators = this.options.locales[this.getLocale(vm)]
    if (generators.hasOwnProperty(rule)) {
      return generators[rule](validationContext)
    } else if (rule[0] === '_' && generators.hasOwnProperty(rule.substr(1))) {
      return generators[rule.substr(1)](validationContext)
    }
    if (generators.hasOwnProperty('default')) {
      return generators.default(validationContext)
    }
    return 'This field does not have a valid value'
  }

  /**
   * Given an instance of a FormulateForm register it.
   * @param {vm} form
   */
  register (form: FormulateForm) {
    if (form.$options.name === 'FormulateForm' && form.name) {
      this.registry.set(form.name, form)
    }
  }

  /**
   * Given an instance of a form, remove it from the registry.
   * @param {vm} form
   */
  deregister (form: FormulateForm) {
    if (
      form.$options.name === 'FormulateForm' &&
      form.name &&
      this.registry.has(form.name)
    ) {
      this.registry.delete(form.name)
    }
  }

  /**
   * Given an array, this function will attempt to make sense of the given error
   * and hydrate a form with the resulting errors.
   *
   * @param {error} err
   * @param {string} formName
   * @param skip
   */
  handle (err: any, formName: string, skip: boolean = false) {
    const e = skip ? err : this.options.errorHandler(err, formName)
    if (formName && this.registry.has(formName)) {
      this.registry.get(formName).applyErrors({
        formErrors: arrayify(e.formErrors),
        inputErrors: e.inputErrors || {}
      })
    }
    return e
  }

  /**
   * Get the file uploader.
   */
  getUploader () {
    return this.options.uploader || false
  }

  /**
   * Get the global upload url.
   */
  getUploadUrl () {
    return this.options.uploadUrl || false
  }

  /**
   * When re-hydrating a file uploader with an array, get the sub-object key to
   * access the url of the file. Usually this is just "url".
   */
  getFileUrlKey () {
    return this.options.fileUrlKey || 'url'
  }

  /**
   * Create a new instance of an upload.
   */
  createUpload (fileList: FileList, context: Context) {
    return new FileUpload(fileList, context, this.options)
  }
}

export default new Formulate()
