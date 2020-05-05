<template>
  <ul
    v-if="fileUploads.length"
    class="formulate-files"
  >
    <li
      v-for="file in fileUploads"
      :key="file.uuid"
      :data-has-error="!!file.error"
      :data-has-preview="!!(imagePreview && file.previewData)"
    >
      <div class="formulate-file">
        <div
          v-if="!!(imagePreview && file.previewData)"
          class="formulate-file-image-preview"
        >
          <img
            :src="file.previewData"
          >
        </div>
        <div
          class="formulate-file-name"
          :title="file.name"
          v-text="file.name"
        />
        <div
          v-if="file.progress !== false"
          :data-just-finished="file.justFinished"
          :data-is-finished="!file.justFinished && file.complete"
          class="formulate-file-progress"
        >
          <div
            class="formulate-file-progress-inner"
            :style="{width: file.progress + '%'}"
          />
        </div>
        <div
          v-if="(file.complete && !file.justFinished) || file.progress === false"
          class="formulate-file-remove"
          @click="file.removeFile"
        />
      </div>
      <div
        v-if="file.error"
        class="formulate-file-upload-error"
        v-text="file.error"
      />
    </li>
  </ul>
</template>

<script lang="ts">
  import { Component, Prop, Watch, Vue } from "vue-property-decorator";
  import FileUpload from "./FileUpload";

  @Component({
    name: "FormulateFiles",

  })
  export default class FormulateFiles extends Vue {
    @Prop({ type: FileUpload, required: true }) files!: FileUpload;
    @Prop({ type: Boolean, default: () => false }) imagePreview!: boolean;

    get fileUploads() {
      return this.files.files || [];
    }

    @Watch("files", { deep: true })
    fileChanged() {
      if (this.imagePreview) {
        this.files.loadPreviews();
      }
    }

    mounted() {
      if (this.imagePreview) {
        this.files.loadPreviews();
      }
    }
  }
</script>
