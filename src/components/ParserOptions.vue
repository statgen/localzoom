<script>
import { makeParser } from '../util/parsers';

export default {
    name: 'ParserOptions',
    // TODO: Handle files where column_titles.length == 0
    props: ['column_titles', 'chr_col', 'pos_col'],
    data() {
        return {
            variantSpecType: 'marker',
            // Individual form field options
            marker_col: null,
            ref_col: null,
            alt_col: null,
            is_log_p: false,
        };
    },
    methods: {
        sendOptions() {
            const { marker_col, chr_col, pos_col, pvalue_col, is_log_p } = this;
            let variant_spec;
            if (this.variantSpecType === 'marker') {
                variant_spec = { marker_col };
            } else {
                variant_spec = { chr_col, pos_col };
            }
            this.$emit(
                'connected',
                Object.assign(variant_spec, { pvalue_col, is_log_p }),
            );
        },
    },
};
</script>

<template>
  <div>
    <h3>Where to find variant identifiers</h3>
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
    <h4>Select field columns</h4>
    <div v-if="variantSpecType === 'marker'" class="form-group row">
      <label for="vs-marker" class="col-sm-3">Marker</label>
      <div class="col-sm-9">
        <select id="vs-marker" v-model="marker_col" class="form-control">
          <option v-for="(item, index) in column_titles" :value="index" :key="index">
            {{ item }}
          </option>
        </select>
      </div>
    </div>
    <div v-else>
      <div class="form-group row">
        <label for="vs-chr" class="col-sm-3">Chromosome</label>
        <div class="col-sm-9">
          <select id="vs-chr" v-model="chr_col" disabled class="form-control">
            <option v-for="(item, index) in column_titles" :value="index" :key="index">
              {{ item }}
            </option>
          </select>
        </div>
      </div>
      <div class="form-group row">
        <label for="vs-pos" class="col-sm-3">Position</label>
        <div class="col-sm-9">
          <select id="vs-pos" v-model="pos_col" disabled class="form-control">
            <option v-for="(item, index) in column_titles" :value="index" :key="index">
              {{ item }}
            </option>
          </select>
        </div>
      </div>
      <div class="form-group row">
        <label for="vs-ref" class="col-sm-3">Ref allele</label>
        <div class="col-sm-9">
          <select id="vs-ref" v-model="ref_col" class="form-control">
            <option v-for="(item, index) in column_titles" :value="index" :key="index">
              {{ item }}
            </option>
          </select>
        </div>
      </div>
      <div class="form-group row">
        <label for="vs-alt" class="col-sm-3">Alt allele</label>
        <div class="col-sm-9">
          <select id="vs-alt" v-model="alt_col" class="form-control">
            <option v-for="(item, index) in column_titles" :value="index" :key="index">
              {{ item }}
            </option>
          </select>
        </div>
      </div>
    </div>
    <div class="form-group row">
      <label for="vs-pval" class="col-sm-3">P-value column</label>
      <div class="col-sm-9">
        <select id="vs-pval" v-model="pvalue_col" class="form-control">
          <option v-for="(item, index) in column_titles" :value="index" :key="index">
            {{ item }}
          </option>
        </select>
      </div>
    </div>

    <div class="form-check form-check-inline">
      <label class="form-check-label">
        <input v-model="is_log_p" type="checkbox" class="form-check-input">Uses -log(p)
      </label>
    </div>
    <br>

    <button class="btn btn-primary" @click="sendOptions">Accept options</button>
  </div>
</template>

<style>
</style>
