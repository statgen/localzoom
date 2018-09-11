<script>
import makeParser from '../util/parsers';

export default {
    name: 'ParserOptions',
    // TODO: Handle files where column_titles.length == 0
    props: ['column_titles', 'sample_data', 'chr_col', 'pos_col'],
    data() {
        return {
            variantSpecType: 'marker',
            // Individual form field options
            marker_col: null,
            ref_col: null,
            alt_col: null,
            pvalue_col: null,
            is_log_p: false,
        };
    },
    computed: {
        variantSpec() {
            // Only provide a value if the variant description is minimally complete
            const { marker_col, chr_col, pos_col, ref_col, alt_col } = this;
            if (this.variantSpecType === 'marker' && marker_col !== null) {
                return { marker_col };
            } else if (pos_col !== null && chr_col !== null) {
                // Ref and alt are optional
                return { chr_col, pos_col, ref_col, alt_col };
            }
            return {};
        },
        options() {
            const { pvalue_col, is_log_p } = this;
            return Object.assign({}, this.variantSpec, { pvalue_col, is_log_p });
        },
        isValid() {
            const hasVariant = Object.keys(this.variantSpec).length !== 0;
            const hasP = this.pvalue_col !== null;
            return hasVariant && hasP;
        },
        parser() {
            if (this.isValid) {
                return makeParser(this.options);
            }
            return () => {};
        },
        preview() {
            try {
                return this.parser(this.sample_data);
            } catch (e) {
                return { error: 'Could not parse column contents' };
            }
        },
    },
    methods: {
        sendOptions() {
            this.$emit(
                'connected',
                this.options,
            );
        },
    },
};
</script>

<template>
  <div>
    <h4>Select field columns</h4>
    <strong class="mr-3">Where to find variant identifiers:</strong>
    <div class="form-check form-check-inline">
      <input id="s2" type="radio" name="source" class="form-check-input"
             value="marker" v-model="variantSpecType">
      <label for="s2" class="form-check-label">Marker</label>
    </div>
    <div class="form-check form-check-inline">
      <input id="s1" type="radio" name="source" class="form-check-input"
             value="columns" v-model="variantSpecType">
      <label for="s1" class="form-check-label">Specific columns</label>
    </div>

    <div v-if="variantSpecType === 'marker'" class="form-group row">
      <label for="vs-marker" class="col-sm-2">Marker</label>
      <div class="col-sm-4">
        <select id="vs-marker" v-model="marker_col" class="form-control">
          <option v-for="(item, index) in column_titles" :value="index" :key="index">
            {{ item }}
          </option>
        </select>
      </div>
    </div>
    <div v-else>
      <div class="form-group row">
        <label for="vs-chr" class="col-sm-2">Chromosome</label>
        <div class="col-sm-4">
          <select id="vs-chr" v-model="chr_col" disabled class="form-control">
            <option v-for="(item, index) in column_titles" :value="index" :key="index">
              {{ item }}
            </option>
          </select>
        </div>
        <label for="vs-pos" class="col-sm-2">Position</label>
        <div class="col-sm-4">
          <select id="vs-pos" v-model="pos_col" disabled class="form-control">
            <option v-for="(item, index) in column_titles" :value="index" :key="index">
              {{ item }}
            </option>
          </select>
        </div>
      </div>
      <div class="form-group row">
        <label for="vs-ref" class="col-sm-2">Ref allele</label>
        <div class="col-sm-4">
          <select id="vs-ref" v-model="ref_col" class="form-control">
            <option v-for="(item, index) in column_titles" :value="index" :key="index">
              {{ item }}
            </option>
          </select>
        </div>
        <label for="vs-alt" class="col-sm-2">Alt allele</label>
        <div class="col-sm-4">
          <select id="vs-alt" v-model="alt_col" class="form-control">
            <option v-for="(item, index) in column_titles" :value="index" :key="index">
              {{ item }}
            </option>
          </select>
        </div>
      </div>
    </div>
    <div class="form-group row">
      <label for="vs-pval" class="col-sm-2">P-value column</label>
      <div class="col-sm-4">
        <select id="vs-pval" v-model="pvalue_col" class="form-control">
          <option v-for="(item, index) in column_titles" :value="index" :key="index">
            {{ item }}
          </option>
        </select>
      </div>
      <div class="col-sm-6">
        <div class="form-check form-check-inline">
          <label class="form-check-label">
            <input v-model="is_log_p" type="checkbox" class="form-check-input">Uses -log(p)
          </label>
        </div>
      </div>
    </div>

    <h4>Preview</h4>
    <div class="row">
      <div class="card card-body bg-light">
        <div v-if="isValid && preview.error">
          <span class="text-danger">{{ preview.error }}</span>
        </div>
        <div v-else-if="isValid">
          Variant: {{ preview.variant }}<br>
          -log(p): {{ preview.log_pvalue }}
        </div>
        <div v-else>
          Please select options to continue
        </div>
      </div>
    </div>

    <div class="row">
      <button class="btn btn-primary" @click="sendOptions">Accept options</button>
    </div>
  </div>
</template>

<style>
</style>
