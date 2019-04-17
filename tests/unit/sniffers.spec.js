import { isHeader } from '@/util/sniffers';
import { assert } from 'chai';


describe('Automatic header detection', () => {
    it('Correctly identifies various header rules', () => {
        assert.isOk(isHeader('#Comment'), 'Comment lines are headers!');
        assert.isOk(isHeader('Header\tLabels'), 'Headers tend to be text');
        assert.isNotOk(isHeader('X\t100'), 'Data has numbers');
        assert.isNotOk(isHeader('X\t.'), 'Missing data is still data');
        assert.isNotOk(isHeader('X,100', { delimiter: ',' }), 'Handles data as csv');
        assert.isOk(isHeader('//100', { comment_char: '//' }), 'Handles different comments');
    });
});
