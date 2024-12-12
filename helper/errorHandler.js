// eslint-disable-next-line arrow-body-style
export const handleError = (res, errorCode, message) => {
    return res.status(errorCode).json({ error: message });
  };
  
  export const errorMessages = {
    unauthorized: 'Unauthorized',
    missingName: 'Missing name',
    missingType: 'Missing type',
    missingData: 'Missing data',
    parentNotFound: 'Parent not found',
    parentNotFolder: 'Parent is not a folder',
    notFound: 'Not found',
  };
  