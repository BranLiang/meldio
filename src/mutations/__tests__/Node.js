import { newGlobalId, typeFromGlobalId } from '../../jsutils/globalId';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import {
  parse,
  analyzeAST,
  validate
} from '../../schema';
import { FakeCrud } from './FakeCrud';
import { Node } from '../Node';
import { NodeObject } from '../NodeObject';
import { NodeConnection } from '../NodeConnection';
import { schemaDefinition } from './schemaDefinition';

chai.use(chaiAsPromised);
chai.use(sinonChai);

/* eslint no-unused-expressions:0 */

const ast = parse(schemaDefinition);
const schema = analyzeAST(ast);
const validationResult = validate(schema);
const mutation = {
  name: 'test',
  clientMutationId: 'a',
  globalIds: [ ]
};

const mkContext = id => ({
  schema,
  crud: FakeCrud(),
  mutation,
  type: typeFromGlobalId(id),
  id,
});

describe('mutations / Node', () => {
  it('test schema is valid', () => {
    expect(validationResult).to.have.length(0);
  });

  it('could be instantiated with function call', () => {
    const id = newGlobalId('Post');
    const context = mkContext(id);
    const post = Node(context);
    expect(post instanceof Node).to.equal(true);
    expect(post.id).to.equal(id);
    expect(post.type).to.equal('Post');
  });

  it('exists should invoke crud.existsNode', async () => {
    const id = newGlobalId('Post');
    const context = mkContext(id);
    const existsStub = sinon.stub(context.crud, 'existsNode');
    existsStub.returns(true);
    const post = new Node(context);
    const exists = await post.exists();
    expect(exists).to.equal(true);
    expect(existsStub).to.have.been.calledOnce;
    expect(existsStub).to.have.been.calledWith('Post', id);
  });

  it('get should return NodeObject if node exists', async () => {
    const id = newGlobalId('Post');
    const context = mkContext(id);
    const getNodeStub = sinon.stub(context.crud, 'getNode');
    getNodeStub.returns({ id, text: 'Great post!' });
    const post = await Node(context).get();
    expect(post instanceof NodeObject).to.equal(true);
    expect(post.id).to.equal(id);
    expect(post.text).to.equal('Great post!');
    expect(getNodeStub).to.have.been.calledOnce;
    expect(getNodeStub).to.have.been.calledWith('Post', id);
  });

  it('get should return null if node does not exist', async () => {
    const id = newGlobalId('Post');
    const context = mkContext(id);
    const getNodeStub = sinon.stub(context.crud, 'getNode');
    getNodeStub.returns(null);
    const post = await Node(context).get();
    expect(post).to.be.null;
    expect(getNodeStub).to.have.been.calledOnce;
    expect(getNodeStub).to.have.been.calledWith('Post', id);
  });

  it('delete should return id if node is deleted', async () => {
    const id = newGlobalId('Post');
    const context = mkContext(id);
    const deleteNodeStub = sinon.stub(context.crud, 'deleteNode');
    deleteNodeStub.returns(true);
    const deletedId = await Node(context).delete();
    expect(deletedId).to.equal(id);
    expect(deleteNodeStub).to.have.been.calledOnce;
    expect(deleteNodeStub).to.have.been.calledWith('Post', id);
  });

  it('delete should return null if node is not deleted', async () => {
    const id = newGlobalId('Post');
    const context = mkContext(id);
    const deleteNodeStub = sinon.stub(context.crud, 'deleteNode');
    deleteNodeStub.returns(false);
    const deletedId = await Node(context).delete();
    expect(deletedId).to.be.null;
    expect(deleteNodeStub).to.have.been.calledOnce;
    expect(deleteNodeStub).to.have.been.calledWith('Post', id);
  });

  // update
  it('update should return Node instance if node is updated', async () => {
    const id = newGlobalId('Post');
    const context = mkContext(id);
    const updateNodeStub = sinon.stub(context.crud, 'updateNode');
    updateNodeStub.returns(true);
    const updated = await Node(context).update({text: 'Looks great'});
    expect(updated instanceof Node).to.equal(true);
    expect(updated.id).to.equal(id);
    expect(updateNodeStub).to.have.been.calledOnce;
    expect(updateNodeStub).to.have.been
      .calledWith('Post', id, {text: 'Looks great'});
  });

  it('update should return null if node is not updated', async () => {
    const id = newGlobalId('Post');
    const context = mkContext(id);
    const updateNodeStub = sinon.stub(context.crud, 'updateNode');
    updateNodeStub.returns(false);
    const updated = await Node(context).update({text: 'Looks great'});
    expect(updated).to.be.null;
    expect(updateNodeStub).to.have.been.calledOnce;
    expect(updateNodeStub).to.have.been
      .calledWith('Post', id, {text: 'Looks great'});
  });

  it('update should throw if expression is null or undefined', () => {
    const id = newGlobalId('Post');
    const context = mkContext(id);
    return Promise.all([
      expect(Node(context).update()).to.eventually.be.rejectedWith(
        /Update expression must be an object expression/),

      expect(Node(context).update(null)).to.eventually.be.rejectedWith(
        /Update expression must be an object expression/),

      expect(Node(context).update(123)).to.eventually.be.rejectedWith(
        /Update expression must be an object expression/),

      expect(Node(context).update([ { } ])).to.eventually.be.rejectedWith(
        /Update expression must be an object expression/),

    ]);
  });

  it('node conn getters should return NodeConnection instances', async () => {
    const id = newGlobalId('Post');
    const context = mkContext(id);
    const post = new Node(context);

    expect(post.comments instanceof NodeConnection).to.be.true;
    expect(post.comments.nodeId).to.equal(id);
    expect(post.comments.nodeField).to.equal('comments');
    expect(post.comments.relatedField).to.equal('commentOn');
    expect(post.comments.nodeType).to.equal('Comment');
    expect(post.comments.edgeType).to.be.null;
    expect(post.likes instanceof NodeConnection).to.be.true;
    expect(post.likes.nodeId).to.equal(id);
    expect(post.likes.nodeField).to.equal('likes');
    expect(post.likes.relatedField).to.equal('likeOn');
    expect(post.likes.nodeType).to.equal('Like');
    expect(post.likes.edgeType).to.be.null;

  });
});
