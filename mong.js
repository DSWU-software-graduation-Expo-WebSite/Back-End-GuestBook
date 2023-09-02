// app.js (또는 index.js 등으로 파일명을 지정할 수 있습니다.)
const express = require('express');
const app = express();
const mongodb = require('mongodb');

const mongoURL = 'mongodb+srv://[이름:비밀번호]@atlascluster.5ribwrk.mongodb.net/';
const dbName = 'erd';
const collectionName = 'project';

app.use(express.json()); // JSON 형식의 요청 바디를 파싱하는 미들웨어
app.use(express.urlencoded({ extended: true })); // URL-encoded 형식의 요청 바디를 파싱하는 미들웨어

// MongoDB 연결 함수
async function connectMongoDB() {
  try {
    const client = await mongodb.MongoClient.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    return client.db(dbName).collection(collectionName);
  } catch (error) {
    console.error('Error connecting to the database:', error);
    throw error;
  }
}

// 프로젝트 생성 API 엔드포인트
app.post('/projects', async (req, res) => {
    try {
      let {comments } = req.body;
      const projectsCollection = await connectMongoDB();
  
      // MongoDB에 프로젝트 정보 저장
      const result = await projectsCollection.insertOne({
        comments: []
      });
  
      res.status(201).json({ success: true, projectId: result.insertedId });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ success: false, error: 'Failed to create project' });
    }
  });


// 전체 프로젝트 조회 API 엔드포인트
app.get('/projects', async (req, res) => {
    try {
      const projectCollection = await connectMongoDB();
  
      // 전체 프로젝트 조회
      const projects = await projectCollection.find().toArray();
  
      res.json(projects);
    } catch (error) {
      console.error('Error retrieving projects:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

// 각 프로젝트 조회 API 엔드포인트
app.get('/projects/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const projectCollection = await connectMongoDB();
    const project = await projectCollection.findOne({ _id: new mongodb.ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error retrieving project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//=================================================================

const crypto = require('crypto');

// 랜덤한 문자열로 commentId 생성하는 함수
function generateCommentId() {
  return crypto.randomBytes(8).toString('hex');
}

// 프로젝트에 댓글 추가 API 엔드포인트
app.post('/projects/:projectId/comments', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const { createBy, password, phone, check_agree, content, createDate } = req.body;
  
      // 프로젝트 ID가 유효한지 확인
      // (생략: 프로젝트 ID가 유효하지 않으면 404 Not Found 응답을 반환)
  
      const projectCollection = await connectMongoDB();
  
      // 댓글 객체 생성
      const comment = {
        commentId: generateCommentId(),
        createBy,
        password,
        phone,
        check_agree,
        content,
        createDate: new Date(),
      };
  
      // MongoDB에 댓글 정보 추가
      const result = await projectCollection.updateOne(
        { _id: new mongodb.ObjectId(projectId) },
        { $push: { comments: comment } }
      );
  
      if (result.matchedCount === 0) {
        // 업데이트된 문서가 없으면 프로젝트가 없음을 의미
        return res.status(404).json({ message: 'Project not found' });
      }
  
      res.status(201).json({ success: true, commentId: comment._id });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ success: false, error: 'Failed to add comment' });
    }
  });

// 각 프로젝트 당 전체 댓글 조회 API 엔드포인트
app.get('/projects/:projectId/comments', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const projectCollection = await connectMongoDB();

    // 프로젝트 조회
    const project = await projectCollection.findOne({ _id: new mongodb.ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // 해당 프로젝트의 전체 댓글 조회
    const comments = project.comments;

    res.json(comments);
  } catch (error) {
    console.error('Error retrieving comments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 각 댓글 조회 API 엔드포인트
app.get('/projects/:projectId/comments/:commentId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const commentId = req.params.commentId;
    const projectCollection = await connectMongoDB();

    // 프로젝트 조회
    const project = await projectCollection.findOne({ _id: new mongodb.ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // 댓글 필터링
    const comment = project.comments.find((c) => c.commentId === commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.json(comment);
  } catch (error) {
    console.error('Error retrieving comment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//-----------------------------------------------------------------------------------
//각 댓글 비밀번호, 연락처 가져와서 댓글 수정
  app.put('/projects/:projectId/comments/:commentId', async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const commentId = req.params.commentId;
      const {password, phone, content} = req.body;

      const projectCollection = await connectMongoDB();

      //project 조회
      const project = await projectCollection.findOne({
        _id: new mongodb.ObjectId(projectId),
        'comments.commentId' : commentId,
      })

      //project 아니면
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
  
      // 댓글을 찾을 때는 프로젝트 ID와 comment ID 모두를 활용하여 검색해야 합니다.
      const comment = project.comments.find((c) => c.commentId === commentId);
  
      // 댓글의 비밀번호와 전화번호가 일치하는지 확인
      if (comment.password !== password || comment.phone !== phone) {
        return res.status(401).json({ message: 'Unauthorized to update the comment' });
      }
  
      // 댓글 업데이트
      comment.content = content;
      // 댓글 수정일 업데이트
			comment.createDate = new Date(); 
      const result = await projectCollection.updateOne(
        {
          _id: new mongodb.ObjectId(projectId),
          'comments.commentId': commentId,
        },
        { $set: { 'comments.$': comment } }
      );
  
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Project or Comment not found' });
      }
  
      res.json({ success: true, commentId: comment.commentId });
    } catch (error) {
      console.error('Error updating comment:', error);
      res.status(500).json({ success: false, error: 'Failed to update comment' });
    }
  });

//-----------------------------------------------------------------------------------
// 각 댓글 삭제 API 엔드포인트
app.delete('/projects/:projectId/comments/:commentId', async (req, res) => {
  const projectId = req.params.projectId;
  const commentId = req.params.commentId;
  const {password, phone} = req.body;

  const projectsCollection = await connectMongoDB();

  // 프로젝트 조회
  const project = await projectsCollection.findOne({ _id: new mongodb.ObjectId(projectId) });

  if (!project) {
  return res.status(404).json({ message: 'Project not found' });
  }

  try {
  // 댓글 조회 및 삭제
  const comments = project.comments;
  const commentIndex = comments.findIndex((comment) => (
    comment.commentId === commentId &&
    comment.phone === phone &&
    comment.password === password
  ));
  
  if (commentIndex === -1) {
    return res.status(404).json({ message: 'Unauthorized to update the comment' });
  }

  comments.splice(commentIndex, 1);
  
  // 수정된 프로젝트 업데이트
  await projectsCollection.updateOne(
    { _id: new mongodb.ObjectId(projectId) },
    { $set: { comments: comments } }
  );

    return res.status(200).json({ message: 'Delete the comment successfully'});
  } catch (error) {
    console.error("댓글 삭제 중 오류 발생 : ", error);
    return res.status(500).json({ message: 'Failed to delete the comment'})
  }
});

// 서버 시작
const port = 3000; // 원하는 포트 번호로 변경 가능
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
